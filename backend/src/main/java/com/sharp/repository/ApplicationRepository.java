package com.sharp.repository;

import com.sharp.entity.ApplicationEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<ApplicationEntity, Long> {
    Optional<ApplicationEntity> findByName(String name);
    Optional<ApplicationEntity> findByDockerContainerId(String dockerContainerId);
    List<ApplicationEntity> findByStatus(String status);
    long countByStatus(String status);
}
