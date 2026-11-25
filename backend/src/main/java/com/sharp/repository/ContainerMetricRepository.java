package com.sharp.repository;

import com.sharp.entity.ContainerMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ContainerMetricRepository extends JpaRepository<ContainerMetric, Long> {
    Optional<ContainerMetric> findTopByOrderByCollectedAtDesc();
    List<ContainerMetric> findByCollectedAt(Instant collectedAt);
    List<ContainerMetric> findByContainerIdOrderByCollectedAtDesc(String containerId);
    long deleteByCollectedAtBefore(Instant cutoff);
}
