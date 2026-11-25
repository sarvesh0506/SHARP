package com.sharp;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sharp.entity.Role;
import com.sharp.entity.User;
import com.sharp.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
class UserManagementTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private String loginAndGetToken(String username, String password) throws Exception {
        String body = objectMapper.writeValueAsString(java.util.Map.of("username", username, "password", password));
        MvcResult res = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode root = objectMapper.readTree(res.getResponse().getContentAsString());
        return root.get("data").get("token").asText();
    }

    private User createTempOperator() {
        String suffix = UUID.randomUUID().toString().substring(0, 6);
        return userRepository.save(User.builder()
                .username("op_test_" + suffix)
                .email("op_test_" + suffix + "@sharp.local")
                .passwordHash(passwordEncoder.encode("Pass@1234"))
                .role(Role.ROLE_OPERATOR)
                .enabled(true)
                .build());
    }

    @Test
    void adminCanListAndRetrieveUsersWithoutSensitiveFields() throws Exception {
        String adminToken = loginAndGetToken("admin", "Admin@123");

        MvcResult listRes = mockMvc.perform(get("/api/v1/users?search=admin")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items", hasSize(greaterThanOrEqualTo(1))))
                .andReturn();

        String rawJson = listRes.getResponse().getContentAsString();
        assertFalse(rawJson.contains("passwordHash"), "Response must never expose passwordHash");
        assertFalse(rawJson.contains("$2a$"), "Response must never expose BCrypt hashes");

        User adminUser = userRepository.findByUsername("admin").orElseThrow();
        MvcResult getRes = mockMvc.perform(get("/api/v1/users/" + adminUser.getId())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username", is("admin")))
                .andExpect(jsonPath("$.data.role", is("ROLE_ADMIN")))
                .andReturn();

        assertFalse(getRes.getResponse().getContentAsString().contains("passwordHash"));
    }

    @Test
    void nonAdminCannotAccessUserManagement() throws Exception {
        String opToken = loginAndGetToken("operator", "Operator@123");

        mockMvc.perform(get("/api/v1/users")
                        .header("Authorization", "Bearer " + opToken))
                .andExpect(status().isForbidden());

        User adminUser = userRepository.findByUsername("admin").orElseThrow();
        mockMvc.perform(put("/api/v1/users/" + adminUser.getId() + "/role")
                        .header("Authorization", "Bearer " + opToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ROLE_OPERATOR\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanChangeRoleAndInvalidRoleIsRejected() throws Exception {
        String adminToken = loginAndGetToken("admin", "Admin@123");
        User op = createTempOperator();

        mockMvc.perform(put("/api/v1/users/" + op.getId() + "/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ROLE_ADMIN\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role", is("ROLE_ADMIN")));

        mockMvc.perform(put("/api/v1/users/" + op.getId() + "/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"SUPER_ROOT\"}"))
                .andExpect(status().isBadRequest());

        // Demote temp user back to operator so admin remains the sole active admin
        mockMvc.perform(put("/api/v1/users/" + op.getId() + "/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ROLE_OPERATOR\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void disabledUserCannotAuthenticateAndAdminCannotDisableSelfOrLastAdmin() throws Exception {
        String adminToken = loginAndGetToken("admin", "Admin@123");
        User op = createTempOperator();

        // Disable operator
        mockMvc.perform(put("/api/v1/users/" + op.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.enabled", is(false)));

        // Disabled user cannot login
        String loginBody = objectMapper.writeValueAsString(java.util.Map.of("username", op.getUsername(), "password", "Pass@1234"));
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(loginBody))
                .andExpect(status().isForbidden());

        // Admin cannot disable self
        User adminUser = userRepository.findByUsername("admin").orElseThrow();
        mockMvc.perform(put("/api/v1/users/" + adminUser.getId() + "/status")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"enabled\":false}"))
                .andExpect(status().isBadRequest());

        // Last active admin cannot be demoted
        mockMvc.perform(put("/api/v1/users/" + adminUser.getId() + "/role")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"ROLE_OPERATOR\"}"))
                .andExpect(status().isConflict());
    }
}
