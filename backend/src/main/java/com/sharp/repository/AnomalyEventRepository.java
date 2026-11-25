package com.sharp.repository;

import com.sharp.entity.AnomalyEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AnomalyEventRepository extends JpaRepository<AnomalyEvent, Long> {
    List<AnomalyEvent> findAllByOrderByDetectedAtDesc();
    List<AnomalyEvent> findByStatusOrderByDetectedAtDesc(String status);
    Optional<AnomalyEvent> findTopByResourceNameAndMetricNameAndStatusInOrderByDetectedAtDesc(
            String resourceName, String metricName, List<String> statuses);
    Optional<AnomalyEvent> findTopByResourceNameAndMetricNameAndDetectedAtAfterOrderByDetectedAtDesc(
            String resourceName, String metricName, Instant after);
    List<AnomalyEvent> findByIncidentId(Long incidentId);
}
