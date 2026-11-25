package com.sharp.repository;

import com.sharp.entity.Incident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentRepository extends JpaRepository<Incident, Long> {
    List<Incident> findByStatus(String status);
    List<Incident> findBySeverity(String severity);
    List<Incident> findByApplicationId(Long applicationId);
    List<Incident> findTop10ByOrderByOpenedAtDesc();
    long countByStatus(String status);
    long countByStatusNot(String status);
}
