package com.sharp.repository;

import com.sharp.entity.RootCauseAnalysis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RootCauseAnalysisRepository extends JpaRepository<RootCauseAnalysis, Long> {
    Optional<RootCauseAnalysis> findTopByIncidentIdOrderByCreatedAtDesc(Long incidentId);
    List<RootCauseAnalysis> findByIncidentIdOrderByCreatedAtDesc(Long incidentId);
}
