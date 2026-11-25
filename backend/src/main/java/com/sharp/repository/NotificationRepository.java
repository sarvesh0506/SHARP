package com.sharp.repository;

import com.sharp.entity.Notification;
import com.sharp.entity.NotificationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientUserIdOrderByCreatedAtDesc(Long recipientUserId, Pageable pageable);

    Page<Notification> findByRecipientUserIdAndIsReadOrderByCreatedAtDesc(
            Long recipientUserId, Boolean isRead, Pageable pageable);

    Page<Notification> findByRecipientUserIdAndTypeOrderByCreatedAtDesc(
            Long recipientUserId, NotificationType type, Pageable pageable);

    Page<Notification> findByRecipientUserIdAndIsReadAndTypeOrderByCreatedAtDesc(
            Long recipientUserId, Boolean isRead, NotificationType type, Pageable pageable);

    long countByRecipientUserIdAndIsReadFalse(Long recipientUserId);

    boolean existsByRecipientUserIdAndDedupKeyAndCreatedAtAfter(
            Long recipientUserId, String dedupKey, Instant after);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true, n.readAt = :readAt WHERE n.recipientUserId = :userId AND n.isRead = false")
    int markAllAsReadByUserId(@Param("userId") Long userId, @Param("readAt") Instant readAt);

    @Modifying
    long deleteByRecipientUserId(Long recipientUserId);
}
