package com.sharp.repository;

import com.sharp.entity.RecoveryAction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RecoveryActionRepository extends JpaRepository<RecoveryAction, Long> {
    List<RecoveryAction> findByIncidentId(Long incidentId);
    List<RecoveryAction> findByStatus(String status);
    List<RecoveryAction> findTop10ByOrderByInitiatedAtDesc();
    List<RecoveryAction> findAllByOrderByInitiatedAtDesc();
    boolean existsByIncidentIdAndStatusIn(Long incidentId, List<String> statuses);
    long countByStatus(String status);
}
