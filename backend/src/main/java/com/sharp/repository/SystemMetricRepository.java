package com.sharp.repository;

import com.sharp.entity.SystemMetric;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface SystemMetricRepository extends JpaRepository<SystemMetric, Long> {
    Optional<SystemMetric> findTopByOrderByCollectedAtDesc();
    List<SystemMetric> findByCollectedAtBetweenOrderByCollectedAtAsc(Instant from, Instant to, Pageable pageable);
    List<SystemMetric> findByCollectedAtBetweenOrderByCollectedAtDescIdDesc(Instant from, Instant to, Pageable pageable);
    List<SystemMetric> findByOrderByCollectedAtDesc(Pageable pageable);
    long deleteByCollectedAtBefore(Instant cutoff);
}
