export interface User {
  id: number;
  username: string;
  email: string;
  role: 'ROLE_ADMIN' | 'ROLE_OPERATOR';
}

export interface AuthResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  email: string;
  role: 'ROLE_ADMIN' | 'ROLE_OPERATOR';
  expiresIn: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface Application {
  id: number;
  name: string;
  description?: string;
  dockerContainerId?: string;
  dockerImage?: string;
  healthEndpoint: string;
  port?: number;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'STOPPED';
  cpuUsage: number;
  memoryUsage: number;
  restartCount: number;
  isAutoRecoveryEnabled: boolean;
  lastHeartbeat?: string;
  createdAt: string;
}

export interface MonitoredServer {
  id: number;
  hostName: string;
  ipAddress: string;
  osType: string;
  agentVersion: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  lastSeen?: string;
  createdAt: string;
}

export interface Incident {
  id: number;
  title: string;
  description: string;
  applicationId?: number;
  applicationName?: string;
  serverId?: number;
  serverHostName?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'DIAGNOSING' | 'RECOVERING' | 'RESOLVED' | 'FAILED';
  rootCause?: string;
  detectedByAgent: string;
  evidence?: string;
  openedAt: string;
  resolvedAt?: string;
}

export interface RecoveryAction {
  id: number;
  incidentId: number;
  incidentTitle?: string;
  actionType: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'PENDING' | 'AWAITING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTING' | 'SUCCESS' | 'FAILED';
  requiresApproval: boolean;
  approvedBy?: string;
  approvalTimestamp?: string;
  executionDetails?: string;
  verificationStatus: 'UNVERIFIED' | 'VERIFYING' | 'VERIFIED_SUCCESS' | 'VERIFIED_FAILURE';
  initiatedAt: string;
  completedAt?: string;
}

export interface DashboardSummary {
  totalApplications: number;
  healthyApplications: number;
  unhealthyApplications: number;
  activeIncidents: number;
  recoverySuccessRate: number;
  avgRecoveryTimeSeconds: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  recentApplications: Application[];
  recentIncidents: Incident[];
}

export interface AuditLog {
  id: number;
  username: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface AgentStatus {
  name: string;
  role: string;
  status: 'ACTIVE' | 'IDLE' | 'LEARNING';
}

// Phase 4B Real Telemetry & Config types
export interface SystemMetric {
  id: number;
  hostName: string;
  osName?: string;
  uptimeSeconds?: number;
  cpuPercent: number | null;
  memoryTotalBytes: number | null;
  memoryUsedBytes: number | null;
  memoryAvailableBytes: number | null;
  memoryPercent: number | null;
  diskTotalBytes: number | null;
  diskUsedBytes: number | null;
  diskFreeBytes: number | null;
  diskPercent: number | null;
  netBytesRecv: number | null;
  netBytesSent: number | null;
  netRecvRateBps: number | null;
  netSentRateBps: number | null;
  collectedAt: string;
}

export interface ProcessMetric {
  id?: number;
  pid: number;
  processName: string;
  cpuPercent: number | null;
  memoryBytes: number | null;
  memoryPercent: number | null;
  status: string;
  startTime?: string | null;
  executablePath?: string | null;
  userName?: string | null;
  collectedAt: string;
}

export interface ProcessPageResponse {
  available: boolean;
  collectedAt: string | null;
  items: ProcessMetric[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  totalHostProcessesSampled?: number;
}

export interface ContainerMetric {
  id?: number;
  containerId: string;
  containerName: string;
  image: string;
  status: string;
  healthStatus?: string;
  cpuPercent: number | null;
  memoryUsageBytes?: number | null;
  memoryLimitBytes?: number | null;
  memoryPercent: number | null;
  netIo?: string | null;
  restartCount?: number;
  uptimeText?: string;
  collectedAt: string;
}

export interface DockerSnapshotResponse {
  available: boolean;
  statusMessage: string;
  dockerVersion?: string | null;
  containers: ContainerMetric[];
  checkedAt?: string;
}

export interface CollectorStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'DISABLED' | 'INITIALIZING';
  enabled: boolean;
  intervalSeconds: number;
  retentionHours: number;
  totalCollections: number;
  lastAttemptAt?: string | null;
  lastSuccessAt?: string | null;
  lastFailureAt?: string | null;
  lastError?: string | null;
  hostDataAvailable: boolean;
  processDataAvailable: boolean;
  dockerAvailable: boolean;
  dockerStatusMessage?: string;
}

export interface SystemConfig {
  id: number;
  configKey: string;
  configValue: string;
  description?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export interface AnalyticsMTTR {
  avgSeconds: number;
  bySeverity: Record<string, number>;
}

export interface AnalyticsSummary {
  mttr: number;
  successRate: number;
  totalIncidents: number;
  resolvedIncidents: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'DIAGNOSING' | 'RECOVERING' | 'RESOLVED' | 'FAILED';
export type RecoveryStatus = 'PENDING' | 'AWAITING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTING' | 'SUCCESS' | 'FAILED';
