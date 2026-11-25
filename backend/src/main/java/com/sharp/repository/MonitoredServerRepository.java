package com.sharp.repository;

import com.sharp.entity.MonitoredServer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MonitoredServerRepository extends JpaRepository<MonitoredServer, Long> {
    Optional<MonitoredServer> findByHostName(String hostName);
    Optional<MonitoredServer> findByIpAddress(String ipAddress);
    List<MonitoredServer> findByStatus(String status);
    long countByStatus(String status);
}
