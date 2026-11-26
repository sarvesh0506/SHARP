package com.sharp;

import com.sharp.entity.Incident;
import com.sharp.entity.MonitoredServer;
import com.sharp.repository.IncidentRepository;
import com.sharp.repository.MonitoredServerRepository;
import com.sharp.service.AuditService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@Transactional
class ServerAndAuditTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private MonitoredServerRepository serverRepository;

    @Autowired
    private IncidentRepository incidentRepository;

    @Autowired
    private AuditService auditService;

    @Test
    @WithMockUser(username = "admin", roles = {"ADMIN"})
    void serverUpdateAndDeletePreserveLinkedIncidents() throws Exception {
        MonitoredServer server = serverRepository.save(MonitoredServer.builder()
                .hostName("edge-node-01")
                .ipAddress("10.0.0.15")
                .osType("Ubuntu 24.04")
                .agentVersion("1.0.0")
                .status("ONLINE")
                .build());

        Incident linked = incidentRepository.save(Incident.builder()
                .title("Server CPU spike")
                .severity("HIGH")
                .status("OPEN")
                .server(server)
                .build());

        mockMvc.perform(put("/api/v1/servers/" + server.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"hostName\":\"edge-node-01-updated\",\"ipAddress\":\"10.0.0.16\",\"osType\":\"Ubuntu 24.04\",\"agentVersion\":\"1.2.0\",\"status\":\"DEGRADED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.hostName").value("edge-node-01-updated"))
                .andExpect(jsonPath("$.data.status").value("DEGRADED"));

        mockMvc.perform(delete("/api/v1/servers/" + server.getId()))
                .andExpect(status().isOk());

        assertFalse(serverRepository.findById(server.getId()).isPresent());
        Incident preserved = incidentRepository.findById(linked.getId()).orElseThrow();
        assertNull(preserved.getServer());
    }

    @Test
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void operatorCannotDeleteServer() throws Exception {
        MonitoredServer server = serverRepository.save(MonitoredServer.builder()
                .hostName("protected-node")
                .ipAddress("10.0.0.99")
                .build());

        mockMvc.perform(delete("/api/v1/servers/" + server.getId()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "operator", roles = {"OPERATOR"})
    void auditPagedSupportsSearchActionFilterAndPagination() throws Exception {
        for (int i = 0; i < 5; i++) {
            auditService.record("audit-tester", "SERVER_UPDATED", "INFRASTRUCTURE",
                    String.valueOf(i), "Updated node #" + i, "127.0.0.1");
        }

        mockMvc.perform(get("/api/v1/audit/paged")
                        .param("search", "audit-tester")
                        .param("action", "SERVER_UPDATED")
                        .param("page", "0")
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items", hasSize(2)))
                .andExpect(jsonPath("$.data.totalElements", greaterThanOrEqualTo(5)))
                .andExpect(jsonPath("$.data.size").value(2));
    }
}
