package com.sharp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharp.dto.IncidentDto;
import com.sharp.entity.NotificationType;
import com.sharp.entity.User;
import com.sharp.repository.NotificationRepository;
import com.sharp.repository.UserRepository;
import com.sharp.service.IncidentService;
import com.sharp.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class NotificationTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private IncidentService incidentService;

    private String login(String username, String password) throws Exception {
        String body = objectMapper.writeValueAsString(java.util.Map.of("username", username, "password", password));
        MvcResult res = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(res.getResponse().getContentAsString()).get("data").get("token").asText();
    }

    @Test
    void unauthorizedRequestsAreRejected() throws Exception {
        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/notifications/unread-count"))
                .andExpect(status().isForbidden());
    }

    @Test
    void recipientRulesAndOwnershipAndCrudLifecycleWork() throws Exception {
        String adminToken = login("admin", "Admin@123");
        String opToken = login("operator", "Operator@123");

        User adminUser = userRepository.findByUsername("admin").orElseThrow();
        User opUser = userRepository.findByUsername("operator").orElseThrow();

        long adminBefore = notificationService.getUnreadCount(adminUser.getId());
        long opBefore = notificationService.getUnreadCount(opUser.getId());

        // 1. ADMINS_ONLY notification must go to admin, NOT operator
        notificationService.notifySafe(
                NotificationType.RECOVERY_APPROVAL_REQUIRED,
                "HIGH",
                "Approval Needed Test",
                "Test approval message",
                null, 999L, null,
                "TEST_ADMIN_ONLY_" + System.nanoTime(),
                NotificationService.RecipientTarget.ADMINS_ONLY
        );

        assertEquals(adminBefore + 1, notificationService.getUnreadCount(adminUser.getId()));
        assertEquals(opBefore, notificationService.getUnreadCount(opUser.getId()));

        // 2. Duplicate dedupKey must NOT create a second notification
        String dupKey = "DUP_TEST_" + System.nanoTime();
        notificationService.notifySafe(
                NotificationType.SYSTEM_ALERT, "INFO", "Dup Test", "Msg 1",
                null, null, null, dupKey, NotificationService.RecipientTarget.ADMINS_AND_OPERATORS);
        notificationService.notifySafe(
                NotificationType.SYSTEM_ALERT, "INFO", "Dup Test", "Msg 2",
                null, null, null, dupKey, NotificationService.RecipientTarget.ADMINS_AND_OPERATORS);

        assertEquals(adminBefore + 2, notificationService.getUnreadCount(adminUser.getId()));
        assertEquals(opBefore + 1, notificationService.getUnreadCount(opUser.getId()));

        // 3. Admin retrieves own notifications & pagination works
        MvcResult adminListRes = mockMvc.perform(get("/api/v1/notifications?page=0&size=1")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items", hasSize(1)))
                .andReturn();

        JsonNode adminListJson = objectMapper.readTree(adminListRes.getResponse().getContentAsString());
        long adminNotifId = adminListJson.get("data").get("items").get(0).get("id").asLong();

        // 4. Operator CANNOT access, mark read, or delete Admin's notification
        mockMvc.perform(get("/api/v1/notifications/" + adminNotifId)
                        .header("Authorization", "Bearer " + opToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/v1/notifications/" + adminNotifId + "/read")
                        .header("Authorization", "Bearer " + opToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/notifications/" + adminNotifId)
                        .header("Authorization", "Bearer " + opToken))
                .andExpect(status().isForbidden());

        // 5. Mark single as read + unread-count updates
        mockMvc.perform(put("/api/v1/notifications/" + adminNotifId + "/read")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.read", is(true)));

        // 6. Mark all as read for admin
        mockMvc.perform(put("/api/v1/notifications/read-all")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/notifications/unread-count")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.unreadCount", is(0)));

        // Operator's unread notification is untouched
        assertTrue(notificationService.getUnreadCount(opUser.getId()) >= 1);

        // 7. Delete-all for operator only deletes operator's notifications
        long adminTotalBeforeOpDelete = notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(
                adminUser.getId(), org.springframework.data.domain.PageRequest.of(0, 50)).getTotalElements();

        mockMvc.perform(delete("/api/v1/notifications")
                        .header("Authorization", "Bearer " + opToken))
                .andExpect(status().isOk());

        assertEquals(0, notificationService.getUnreadCount(opUser.getId()));
        long adminTotalAfterOpDelete = notificationRepository.findByRecipientUserIdOrderByCreatedAtDesc(
                adminUser.getId(), org.springframework.data.domain.PageRequest.of(0, 50)).getTotalElements();
        assertEquals(adminTotalBeforeOpDelete, adminTotalAfterOpDelete);
    }

    @Test
    void lifecycleEventsCreateNotificationsWithoutBreakingCoreFlow() {
        User adminUser = userRepository.findByUsername("admin").orElseThrow();
        long before = notificationService.getUnreadCount(adminUser.getId());

        IncidentDto inc = incidentService.createIncident(IncidentDto.builder()
                .title("Notification Lifecycle Test")
                .description("Verify incident creation triggers notification")
                .severity("HIGH")
                .build(), "admin", "127.0.0.1");
        assertNotNull(inc.getId());

        long afterCreate = notificationService.getUnreadCount(adminUser.getId());
        assertTrue(afterCreate > before, "Incident creation should generate notification");

        incidentService.resolveIncident(inc.getId(), "Fixed", "admin", "127.0.0.1");
        long afterResolve = notificationService.getUnreadCount(adminUser.getId());
        assertTrue(afterResolve > afterCreate, "Incident resolution should generate notification");
    }
}
