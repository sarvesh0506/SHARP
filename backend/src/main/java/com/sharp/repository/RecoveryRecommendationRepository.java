package com.sharp.repository;

import com.sharp.entity.RecoveryRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecoveryRecommendationRepository extends JpaRepository<RecoveryRecommendation, Long> {
    List<RecoveryRecommendation> findAllByOrderByCreatedAtDesc();
    List<RecoveryRecommendation> findByIncidentIdOrderByCreatedAtDesc(Long incidentId);
    List<RecoveryRecommendation> findByStatusOrderByCreatedAtDesc(String status);
}
