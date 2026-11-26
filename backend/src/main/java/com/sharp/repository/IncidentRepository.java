package com.sharp.repository;

import com.sharp.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {
    List<Incident> findByStatus(String status);
    List<Incident> findByStatusIn(List<String> statuses);
    List<Incident> findBySeverity(String severity);
    List<Incident> findByApplicationId(Long applicationId);
    List<Incident> findByServerId(Long serverId);
    List<Incident> findTop10ByOrderByOpenedAtDesc();
    List<Incident> findAllByOrderByOpenedAtDesc();
    Optional<Incident> findTopByAffectedResourceAndStatusNotInOrderByOpenedAtDesc(String affectedResource, List<String> closedStatuses);
    long countByStatus(String status);
    long countByStatusNot(String status);
    long countByStatusNotIn(List<String> statuses);
}
