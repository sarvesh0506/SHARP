package com.sharp.config;

import com.sharp.entity.*;
import com.sharp.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final ApplicationRepository applicationRepository;
    private final MonitoredServerRepository monitoredServerRepository;
    private final IncidentRepository incidentRepository;
    private final RecoveryActionRepository recoveryActionRepository;
    private final AuditLogRepository auditLogRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedUsers();
        seedApplicationsAndServers();
    }

    private void seedUsers() {
        if (!userRepository.existsByUsername("admin")) {
            User admin = User.builder()
                    .username("admin")
                    .email("admin@sharp.local")
                    .passwordHash(passwordEncoder.encode("Admin@123"))
                    .role(Role.ROLE_ADMIN)
                    .enabled(true)
                    .build();
            userRepository.save(admin);
            log.info("Initialized default admin user: admin");
        }

        if (!userRepository.existsByUsername("operator")) {
            User operator = User.builder()
                    .username("operator")
                    .email("operator@sharp.local")
                    .passwordHash(passwordEncoder.encode("Operator@123"))
                    .role(Role.ROLE_OPERATOR)
                    .enabled(true)
                    .build();
            userRepository.save(operator);
            log.info("Initialized default operator user: operator");
        }
    }

    private void seedApplicationsAndServers() {
        if (applicationRepository.count() == 0) {
            ApplicationEntity authApp = ApplicationEntity.builder()
                    .name("auth-service")
                    .description("Core OAuth2 & JWT Authentication Service")
                    .dockerContainerId("c3f892a01b")
                    .dockerImage("sharp/auth-service:v1.2.0")
                    .healthEndpoint("/actuator/health")
                    .port(8081)
                    .status("HEALTHY")
                    .cpuUsage(14.5)
                    .memoryUsage(28.2)
                    .restartCount(0)
                    .isAutoRecoveryEnabled(true)
                    .lastHeartbeat(Instant.now())
                    .build();

            ApplicationEntity paymentApp = ApplicationEntity.builder()
                    .name("payment-gateway")
                    .description("High-Throughput Stripe & PayPal Transaction Gateway")
                    .dockerContainerId("d7e411b98f")
                    .dockerImage("sharp/payment-gw:v2.0.4")
                    .healthEndpoint("/health")
                    .port(8082)
                    .status("HEALTHY")
                    .cpuUsage(22.8)
                    .memoryUsage(45.1)
                    .restartCount(1)
                    .isAutoRecoveryEnabled(true)
                    .lastHeartbeat(Instant.now())
                    .build();

            ApplicationEntity workerApp = ApplicationEntity.builder()
                    .name("notification-worker")
                    .description("Async RabbitMQ and Email Dispatch Worker")
                    .dockerContainerId("a9104c8ef2")
                    .dockerImage("sharp/notifier:v1.0.1")
                    .healthEndpoint("/health")
                    .port(8083)
                    .status("UNHEALTHY")
                    .cpuUsage(89.4)
                    .memoryUsage(92.7)
                    .restartCount(3)
                    .isAutoRecoveryEnabled(true)
                    .lastHeartbeat(Instant.now().minus(5, ChronoUnit.MINUTES))
                    .build();

            applicationRepository.save(authApp);
            applicationRepository.save(paymentApp);
            applicationRepository.save(workerApp);
            log.info("Seeded initial registered applications");

            MonitoredServer primaryServer = MonitoredServer.builder()
                    .hostName("prod-node-01.infra.sharp")
                    .ipAddress("192.168.10.15")
                    .osType("Ubuntu 22.04 LTS")
                    .agentVersion("1.0.0")
                    .status("ONLINE")
                    .cpuUsage(38.2)
                    .memoryUsage(64.5)
                    .diskUsage(42.1)
                    .lastSeen(Instant.now())
                    .build();

            MonitoredServer backupServer = MonitoredServer.builder()
                    .hostName("prod-node-02.infra.sharp")
                    .ipAddress("192.168.10.16")
                    .osType("Ubuntu 22.04 LTS")
                    .agentVersion("1.0.0")
                    .status("ONLINE")
                    .cpuUsage(21.4)
                    .memoryUsage(35.0)
                    .diskUsage(28.9)
                    .lastSeen(Instant.now())
                    .build();

            monitoredServerRepository.save(primaryServer);
            monitoredServerRepository.save(backupServer);
            log.info("Seeded initial monitored servers");

            Incident incident = Incident.builder()
                    .title("OOM & CPU Spike in notification-worker")
                    .description("Container memory exceeded 90% threshold resulting in degraded HTTP response times (>4500ms).")
                    .application(workerApp)
                    .server(primaryServer)
                    .severity("HIGH")
                    .status("RECOVERING")
                    .rootCause("Memory leak detected in queue consumer thread pool. RabbitMQ unacknowledged message buildup.")
                    .detectedByAgent("Sentinel Agent")
                    .evidence("{\"cpu\": 89.4, \"memory\": 92.7, \"error_rate\": 0.28, \"consecutive_failures\": 4}")
                    .openedAt(Instant.now().minus(15, ChronoUnit.MINUTES))
                    .build();
            incidentRepository.save(incident);

            RecoveryAction action = RecoveryAction.builder()
                    .incident(incident)
                    .actionType("RESTART_CONTAINER")
                    .riskLevel("LOW")
                    .status("EXECUTING")
                    .requiresApproval(false)
                    .approvedBy("AUTO_POLICY_ENGINE")
                    .approvalTimestamp(Instant.now().minus(5, ChronoUnit.MINUTES))
                    .executionDetails("Triggered graceful docker restart on container a9104c8ef2 with 30s SIGTERM timeout.")
                    .verificationStatus("VERIFYING")
                    .initiatedAt(Instant.now().minus(5, ChronoUnit.MINUTES))
                    .build();
            recoveryActionRepository.save(action);

            AuditLog logEntry = AuditLog.builder()
                    .username("SYSTEM")
                    .action("AUTO_RECOVERY_TRIGGERED")
                    .resourceType("APPLICATION")
                    .resourceId(workerApp.getId().toString())
                    .details("Triggered low-risk container restart for notification-worker following OOM anomaly.")
                    .ipAddress("127.0.0.1")
                    .timestamp(Instant.now().minus(5, ChronoUnit.MINUTES))
                    .build();
            auditLogRepository.save(logEntry);
        }
    }
}
