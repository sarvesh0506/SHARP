package com.sharp.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class EventBroadcastService {

    private static final Logger log = LoggerFactory.getLogger(EventBroadcastService.class);

    private final SimpMessagingTemplate messagingTemplate;

    public void publish(String eventType, Object payload) {
        try {
            Map<String, Object> envelope = new LinkedHashMap<>();
            envelope.put("type", eventType);
            envelope.put("timestamp", Instant.now().toString());
            envelope.put("payload", payload);
            messagingTemplate.convertAndSend("/topic/events", envelope);
        } catch (Exception e) {
            log.debug("WebSocket broadcast skipped ({}): {}", eventType, e.getMessage());
        }
    }
}
