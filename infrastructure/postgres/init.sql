-- =============================================================================
-- SHARP Database Initialization Schema (PostgreSQL)
-- =============================================================================

-- 1. Users & Roles
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'OPERATOR',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Applications (Docker Containers & Services)
CREATE TABLE IF NOT EXISTS applications (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    docker_container_id VARCHAR(100),
    docker_image VARCHAR(255),
    health_endpoint VARCHAR(255) DEFAULT '/health',
    port INT,
    status VARCHAR(30) NOT NULL DEFAULT 'HEALTHY',
    cpu_usage DOUBLE PRECISION DEFAULT 0.0,
    memory_usage DOUBLE PRECISION DEFAULT 0.0,
    restart_count INT DEFAULT 0,
    is_auto_recovery_enabled BOOLEAN DEFAULT TRUE,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Monitored Infrastructure Servers
CREATE TABLE IF NOT EXISTS monitored_servers (
    id BIGSERIAL PRIMARY KEY,
    host_name VARCHAR(100) NOT NULL,
    ip_address VARCHAR(50) NOT NULL,
    os_type VARCHAR(50) DEFAULT 'Linux',
    agent_version VARCHAR(30) DEFAULT '1.0.0',
    status VARCHAR(30) NOT NULL DEFAULT 'ONLINE',
    cpu_usage DOUBLE PRECISION DEFAULT 0.0,
    memory_usage DOUBLE PRECISION DEFAULT 0.0,
    disk_usage DOUBLE PRECISION DEFAULT 0.0,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Incidents
CREATE TABLE IF NOT EXISTS incidents (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    application_id BIGINT REFERENCES applications(id) ON DELETE SET NULL,
    server_id BIGINT REFERENCES monitored_servers(id) ON DELETE SET NULL,
    severity VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    root_cause TEXT,
    detected_by_agent VARCHAR(50) DEFAULT 'Sentinel Agent',
    evidence JSONB,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- 5. Recovery Actions
CREATE TABLE IF NOT EXISTS recovery_actions (
    id BIGSERIAL PRIMARY KEY,
    incident_id BIGINT REFERENCES incidents(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    risk_level VARCHAR(20) NOT NULL DEFAULT 'LOW',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    requires_approval BOOLEAN DEFAULT FALSE,
    approved_by VARCHAR(50),
    approval_timestamp TIMESTAMP WITH TIME ZONE,
    execution_details TEXT,
    verification_status VARCHAR(30) DEFAULT 'UNVERIFIED',
    initiated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 6. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed default admin and operator (password: Admin@123 / Operator@123)
-- BCrypt hashes generated with standard cost factor 10:
-- Admin@123 -> $2a$10$wT2XyGzI7f1uVlqYwV.bQOWxGqM7G9c1xG9f1uVlqYwV.bQOWxGqM (will be seeded cleanly via DataInitializer)
