package com.sharp.monitoring;

import com.sharp.entity.SystemMetric;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.HardwareAbstractionLayer;
import oshi.hardware.NetworkIF;
import oshi.software.os.FileSystem;
import oshi.software.os.OSFileStore;
import oshi.software.os.OperatingSystem;

import java.net.InetAddress;
import java.time.Instant;
import java.util.List;

@Component
public class HostTelemetryCollector {

    private static final Logger log = LoggerFactory.getLogger(HostTelemetryCollector.class);

    private final SystemInfo systemInfo = new SystemInfo();
    private final HardwareAbstractionLayer hal = systemInfo.getHardware();
    private final OperatingSystem os = systemInfo.getOperatingSystem();

    private long[] prevCpuTicks;
    private Long prevNetRecv;
    private Long prevNetSent;
    private Instant prevNetTime;

    public synchronized SystemMetric collect() {
        Instant now = Instant.now();

        String hostName = resolveHostName();
        String osName = os.toString();
        Long uptimeSeconds = os.getSystemUptime();

        // CPU calculation using tick delta
        Double cpuPercent = null;
        try {
            CentralProcessor processor = hal.getProcessor();
            long[] currentTicks = processor.getSystemCpuLoadTicks();
            if (prevCpuTicks != null) {
                double load = processor.getSystemCpuLoadBetweenTicks(prevCpuTicks) * 100.0;
                if (!Double.isNaN(load) && load >= 0.0) {
                    cpuPercent = round(Math.min(load, 100.0));
                }
            }
            prevCpuTicks = currentTicks;
        } catch (Exception e) {
            log.warn("Failed to collect host CPU metrics: {}", e.getMessage());
        }

        // Memory calculation
        Long memTotal = null;
        Long memAvailable = null;
        Long memUsed = null;
        Double memPercent = null;
        try {
            GlobalMemory memory = hal.getMemory();
            memTotal = memory.getTotal();
            memAvailable = memory.getAvailable();
            if (memTotal > 0) {
                memUsed = Math.max(0L, memTotal - memAvailable);
                memPercent = round(((double) memUsed / memTotal) * 100.0);
            }
        } catch (Exception e) {
            log.warn("Failed to collect host memory metrics: {}", e.getMessage());
        }

        // Disk calculation across mounted file stores
        Long diskTotal = null;
        Long diskFree = null;
        Long diskUsed = null;
        Double diskPercent = null;
        try {
            FileSystem fs = os.getFileSystem();
            List<OSFileStore> stores = fs.getFileStores();
            long total = 0L;
            long free = 0L;
            for (OSFileStore store : stores) {
                long t = store.getTotalSpace();
                long u = store.getUsableSpace();
                if (t > 0) {
                    total += t;
                    free += u;
                }
            }
            if (total > 0) {
                diskTotal = total;
                diskFree = free;
                diskUsed = Math.max(0L, total - free);
                diskPercent = round(((double) diskUsed / total) * 100.0);
            }
        } catch (Exception e) {
            log.warn("Failed to collect host disk metrics: {}", e.getMessage());
        }

        // Network bytes & rate calculation
        Long netRecv = null;
        Long netSent = null;
        Double netRecvRate = null;
        Double netSentRate = null;
        try {
            List<NetworkIF> nics = hal.getNetworkIFs();
            long totalRecv = 0L;
            long totalSent = 0L;
            for (NetworkIF nic : nics) {
                nic.updateAttributes();
                totalRecv += nic.getBytesRecv();
                totalSent += nic.getBytesSent();
            }
            netRecv = totalRecv;
            netSent = totalSent;

            if (prevNetRecv != null && prevNetSent != null && prevNetTime != null) {
                double elapsedSec = (now.toEpochMilli() - prevNetTime.toEpochMilli()) / 1000.0;
                if (elapsedSec > 0.1) {
                    long deltaRecv = Math.max(0L, totalRecv - prevNetRecv);
                    long deltaSent = Math.max(0L, totalSent - prevNetSent);
                    netRecvRate = round(deltaRecv / elapsedSec);
                    netSentRate = round(deltaSent / elapsedSec);
                }
            }
            prevNetRecv = totalRecv;
            prevNetSent = totalSent;
            prevNetTime = now;
        } catch (Exception e) {
            log.warn("Failed to collect host network metrics: {}", e.getMessage());
        }

        return SystemMetric.builder()
                .hostName(hostName)
                .osName(osName)
                .uptimeSeconds(uptimeSeconds)
                .cpuPercent(cpuPercent)
                .memoryTotalBytes(memTotal)
                .memoryUsedBytes(memUsed)
                .memoryAvailableBytes(memAvailable)
                .memoryPercent(memPercent)
                .diskTotalBytes(diskTotal)
                .diskUsedBytes(diskUsed)
                .diskFreeBytes(diskFree)
                .diskPercent(diskPercent)
                .netBytesRecv(netRecv)
                .netBytesSent(netSent)
                .netRecvRateBps(netRecvRate)
                .netSentRateBps(netSentRate)
                .collectedAt(now)
                .build();
    }

    private String resolveHostName() {
        try {
            return InetAddress.getLocalHost().getHostName();
        } catch (Exception e) {
            return os.getNetworkParams().getHostName();
        }
    }

    private double round(double val) {
        return Math.round(val * 100.0) / 100.0;
    }
}
