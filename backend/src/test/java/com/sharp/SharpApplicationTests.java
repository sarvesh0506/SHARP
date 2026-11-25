package com.sharp;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("dev")
class SharpApplicationTests {

    @Test
    void contextLoads() {
        // Confirms Spring Boot 3 context, JPA, Security, and Beans load without error
    }
}
