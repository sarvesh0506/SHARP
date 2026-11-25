package com.sharp.repository;

import com.sharp.entity.ProcessMetric;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ProcessMetricRepository extends JpaRepository<ProcessMetric, Long> {
    Optional<ProcessMetric> findTopByOrderByCollectedAtDesc();
    List<ProcessMetric> findByCollectedAt(Instant collectedAt);
    List<ProcessMetric> findByPidOrderByCollectedAtDesc(Integer pid);
    long deleteByCollectedAtBefore(Instant cutoff);
}
