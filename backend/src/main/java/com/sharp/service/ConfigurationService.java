package com.sharp.service;

import com.sharp.entity.SystemConfiguration;
import com.sharp.exception.ApiException;
import com.sharp.repository.SystemConfigurationRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ConfigurationService {

    private final SystemConfigurationRepository configRepository;
    private final AuditService auditService;

    private static final Map<String, String[]> DEFAULTS = new LinkedHashMap<>();

    static {
        DEFAULTS.put("monitoring.enabled", new String[]{"true", "Enable background telemetry collection"});
        DEFAULTS.put("monitoring.interval_sec", new String[]{"10", "Telemetry collection interval in seconds (2-300)"});
        DEFAULTS.put("monitoring.retention_hours", new String[]{"24", "Telemetry history retention period in hours (1-720)"});
        DEFAULTS.put("threshold.cpu.warning", new String[]{"75", "CPU warning threshold (%)"});
        DEFAULTS.put("threshold.cpu.critical", new String[]{"90", "CPU critical threshold (%)"});
        DEFAULTS.put("threshold.memory.warning", new String[]{"80", "Memory warning threshold (%)"});
        DEFAULTS.put("threshold.memory.critical", new String[]{"92", "Memory critical threshold (%)"});
        DEFAULTS.put("threshold.disk.warning", new String[]{"85", "Disk warning threshold (%)"});
        DEFAULTS.put("threshold.network.mbps_warning", new String[]{"100", "Network throughput warning threshold (Mbps)"});
    }

    @PostConstruct
    @Transactional
    public void seedDefaults() {
        for (Map.Entry<String, String[]> entry : DEFAULTS.entrySet()) {
            if (configRepository.findByConfigKey(entry.getKey()).isEmpty()) {
                configRepository.save(SystemConfiguration.builder()
                        .configKey(entry.getKey())
                        .configValue(entry.getValue()[0])
                        .description(entry.getValue()[1])
                        .updatedBy("SYSTEM")
                        .build());
            }
        }
    }

    @Transactional(readOnly = true)
    public List<SystemConfiguration> getAllConfigs() {
        return configRepository.findAll();
    }

    @Transactional(readOnly = true)
    public boolean getBoolean(String key, boolean fallback) {
        return configRepository.findByConfigKey(key)
                .map(c -> Boolean.parseBoolean(c.getConfigValue()))
                .orElse(fallback);
    }

    @Transactional(readOnly = true)
    public int getInt(String key, int fallback) {
        return configRepository.findByConfigKey(key)
                .map(c -> {
                    try {
                        return Integer.parseInt(c.getConfigValue());
                    } catch (NumberFormatException e) {
                        return fallback;
                    }
                })
                .orElse(fallback);
    }

    @Transactional
    public List<SystemConfiguration> updateConfigs(Map<String, String> updates, String username, String ip) {
        if (updates == null || updates.isEmpty()) {
            throw new ApiException("No configuration keys provided", HttpStatus.BAD_REQUEST);
        }

        // Cross-field validation
        int cpuWarn = parseIntOrCurrent(updates, "threshold.cpu.warning", 75);
        int cpuCrit = parseIntOrCurrent(updates, "threshold.cpu.critical", 90);
        if (cpuWarn < 1 || cpuCrit > 100 || cpuWarn >= cpuCrit) {
            throw new ApiException("CPU warning threshold must be less than critical threshold (1-100%)", HttpStatus.BAD_REQUEST);
        }

        int memWarn = parseIntOrCurrent(updates, "threshold.memory.warning", 80);
        int memCrit = parseIntOrCurrent(updates, "threshold.memory.critical", 92);
        if (memWarn < 1 || memCrit > 100 || memWarn >= memCrit) {
            throw new ApiException("Memory warning threshold must be less than critical threshold (1-100%)", HttpStatus.BAD_REQUEST);
        }

        int interval = parseIntOrCurrent(updates, "monitoring.interval_sec", 10);
        if (interval < 2 || interval > 300) {
            throw new ApiException("Monitoring interval must be between 2 and 300 seconds", HttpStatus.BAD_REQUEST);
        }

        int retention = parseIntOrCurrent(updates, "monitoring.retention_hours", 24);
        if (retention < 1 || retention > 720) {
            throw new ApiException("Metric retention period must be between 1 and 720 hours", HttpStatus.BAD_REQUEST);
        }

        for (Map.Entry<String, String> entry : updates.entrySet()) {
            String key = entry.getKey();
            if (!DEFAULTS.containsKey(key)) {
                throw new ApiException("Unsupported configuration key: " + key, HttpStatus.BAD_REQUEST);
            }
            SystemConfiguration cfg = configRepository.findByConfigKey(key)
                    .orElseGet(() -> SystemConfiguration.builder()
                            .configKey(key)
                            .description(DEFAULTS.get(key)[1])
                            .build());
            cfg.setConfigValue(String.valueOf(entry.getValue()).trim());
            cfg.setUpdatedBy(username);
            configRepository.save(cfg);
        }

        auditService.record(username, "CONFIG_UPDATED", "SYSTEM_CONFIGURATION", "GLOBAL",
                "Updated keys: " + String.join(", ", updates.keySet()), ip);

        return configRepository.findAll();
    }

    private int parseIntOrCurrent(Map<String, String> updates, String key, int fallback) {
        String raw = updates.containsKey(key) ? updates.get(key) : String.valueOf(getInt(key, fallback));
        try {
            return Integer.parseInt(raw.trim());
        } catch (NumberFormatException e) {
            throw new ApiException("Invalid integer value for " + key, HttpStatus.BAD_REQUEST);
        }
    }
}
