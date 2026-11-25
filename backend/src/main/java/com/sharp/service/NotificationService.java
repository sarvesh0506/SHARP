package com.sharp.service;

import com.sharp.dto.NotificationDto;
import com.sharp.entity.Notification;
import com.sharp.entity.NotificationType;
import com.sharp.entity.Role;
import com.sharp.entity.User;
import com.sharp.exception.ApiException;
import com.sharp.exception.ResourceNotFoundException;
import com.sharp.repository.NotificationRepository;
import com.sharp.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    public enum RecipientTarget {
        ADMINS_ONLY,
        ADMINS_AND_OPERATORS
    }

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final EventBroadcastService eventBroadcastService;

    /**
     * Safe notification dispatch: failures are logged and never propagate to core monitoring/recovery flows.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void notifySafe(
            NotificationType type,
            String severity,
            String title,
            String message,
            Long anomalyId,
            Long incidentId,
            Long recoveryExecutionId,
            String dedupKey,
            RecipientTarget target) {
        try {
            List<User> recipients = resolveRecipients(target);
            if (recipients.isEmpty()) return;

            Instant now = Instant.now();
            Instant dedupWindow = now.minus(5, ChronoUnit.MINUTES);

            for (User recipient : recipients) {
                if (dedupKey != null && !dedupKey.isBlank()
                        && notificationRepository.existsByRecipientUserIdAndDedupKeyAndCreatedAtAfter(
                                recipient.getId(), dedupKey, dedupWindow)) {
                    continue;
                }

                Notification saved = notificationRepository.save(Notification.builder()
                        .recipientUserId(recipient.getId())
                        .type(type)
                        .severity(severity != null ? severity : "INFO")
                        .title(truncate(title, 190))
                        .message(message != null ? message : "")
                        .anomalyId(anomalyId)
                        .incidentId(incidentId)
                        .recoveryExecutionId(recoveryExecutionId)
                        .dedupKey(dedupKey)
                        .isRead(false)
                        .createdAt(now)
                        .build());

                eventBroadcastService.publishToUser(recipient.getUsername(), "NOTIFICATION_CREATED", toDto(saved));
            }
        } catch (Exception e) {
            log.error("Notification creation failed safely [type={}, title={}]: {}", type, title, e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getUserNotifications(
            Long userId, Boolean isReadFilter, String typeStr, int page, int size) {

        int safePage = Math.max(0, page);
        int safeSize = Math.max(1, Math.min(size, 100));
        PageRequest pageable = PageRequest.of(safePage, safeSize);

        NotificationType parsedType = null;
        if (typeStr != null && !typeStr.isBlank() && !"ALL".equalsIgnoreCase(typeStr)) {
            try {
                parsedType = NotificationType.valueOf(typeStr.trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new ApiException("Invalid notification type: " + typeStr, HttpStatus.BAD_REQUEST);
            }
        }

        Page<Notification> resultPage;
        if (isReadFilter != null && parsedType != null) {
            resultPage = notificationRepository.findByRecipientUserIdAndIsReadAndTypeOrderByCreatedAtDesc(
                    userId, isReadFilter, parsedType, pageable);
        } else if (isReadFilter != null) {
            resultPage = notificationRepository.findByRecipientUserIdAndIsReadOrderByCreatedAtDesc(
                    userId, isReadFilter, pageable);
        } else if (parsedType != null) {
            resultPage = notificationRepository.findByRecipientUserIdAndTypeOrderByCreatedAtDesc(
                    userId, parsedType, pageable);
        } else {
            resultPage = notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(userId, pageable);
        }

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("items", resultPage.getContent().stream().map(this::toDto).toList());
        response.put("totalElements", resultPage.getTotalElements());
        response.put("totalPages", resultPage.getTotalPages());
        response.put("page", resultPage.getNumber());
        response.put("size", resultPage.getSize());
        return response;
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByRecipientUserIdAndIsReadFalse(userId);
    }

    @Transactional(readOnly = true)
    public NotificationDto getNotificationById(Long id, Long currentUserId) {
        Notification notification = findOwnedNotification(id, currentUserId);
        return toDto(notification);
    }

    @Transactional
    public NotificationDto markAsRead(Long id, Long currentUserId) {
        Notification notification = findOwnedNotification(id, currentUserId);
        if (!Boolean.TRUE.equals(notification.getIsRead())) {
            notification.setIsRead(true);
            notification.setReadAt(Instant.now());
            notification = notificationRepository.save(notification);
        }
        return toDto(notification);
    }

    @Transactional
    public int markAllAsRead(Long currentUserId) {
        return notificationRepository.markAllAsReadByUserId(currentUserId, Instant.now());
    }

    @Transactional
    public void deleteNotification(Long id, Long currentUserId) {
        Notification notification = findOwnedNotification(id, currentUserId);
        notificationRepository.delete(notification);
    }

    @Transactional
    public long deleteAllForUser(Long currentUserId) {
        return notificationRepository.deleteByRecipientUserId(currentUserId);
    }

    private Notification findOwnedNotification(Long id, Long currentUserId) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", id));
        if (!Objects.equals(notification.getRecipientUserId(), currentUserId)) {
            throw new AccessDeniedException("You do not have permission to access this notification");
        }
        return notification;
    }

    private List<User> resolveRecipients(RecipientTarget target) {
        List<User> allEnabled = userRepository.findAll().stream()
                .filter(u -> Boolean.TRUE.equals(u.getEnabled()))
                .toList();

        if (target == RecipientTarget.ADMINS_ONLY) {
            return allEnabled.stream()
                    .filter(u -> u.getRole() == Role.ROLE_ADMIN)
                    .toList();
        }
        return allEnabled.stream()
                .filter(u -> u.getRole() == Role.ROLE_ADMIN || u.getRole() == Role.ROLE_OPERATOR)
                .toList();
    }

    private String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() > max ? s.substring(0, max) : s;
    }

    public NotificationDto toDto(Notification n) {
        return NotificationDto.builder()
                .id(n.getId())
                .type(n.getType().name())
                .severity(n.getSeverity())
                .title(n.getTitle())
                .message(n.getMessage())
                .anomalyId(n.getAnomalyId())
                .incidentId(n.getIncidentId())
                .recoveryExecutionId(n.getRecoveryExecutionId())
                .read(n.getIsRead())
                .readAt(n.getReadAt())
                .createdAt(n.getCreatedAt())
                .build();
    }
}
