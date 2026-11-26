import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../pages/DashboardPage';
import apiClient from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../contexts/LiveEventsContext', () => ({
  useLiveEvents: () => ({
    status: 'CONNECTED',
    events: [
      {
        id: 'live-1',
        type: 'INCIDENT_CREATED',
        timestamp: '2026-11-26T12:00:00Z',
        payload: { id: 1, title: 'CPU saturation on prod-node-01' },
      },
    ],
    lastEvent: null,
    paused: false,
    setPaused: vi.fn(),
    clearEvents: vi.fn(),
    reconnect: vi.fn(),
    subscribe: () => () => {},
  }),
}));

describe('DashboardPage (Resilience Command Center)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders lifecycle centerpiece, degradation reasons, KPIs, AI insights, recovery, and live feed', async () => {
    (apiClient.get as any).mockImplementation((url: string) => {
      switch (url) {
        case '/dashboard/summary':
          return Promise.resolve({
            data: {
              data: {
                totalApplications: 3,
                healthyApplications: 2,
                unhealthyApplications: 1,
                activeIncidents: 1,
                recoverySuccessRate: null,
                avgRecoveryTimeSeconds: null,
                avgCpuUsage: 25,
                avgMemoryUsage: 45,
                recentApplications: [],
                recentIncidents: [
                  {
                    id: 10,
                    title: 'OOM on worker',
                    description: 'Memory exceeded 92%',
                    severity: 'CRITICAL',
                    status: 'OPEN',
                    detectedByAgent: 'Detection Agent',
                    rootCause: 'Heap exhaustion in worker service',
                    rcaStatus: 'COMPLETED',
                    recoveryStatus: 'NONE',
                    openedAt: '2026-11-26T10:00:00Z',
                  },
                ],
              },
            },
          });
        case '/servers':
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 1,
                  hostName: 'prod-node-01',
                  ipAddress: '192.168.10.15',
                  osType: 'Ubuntu 22.04',
                  agentVersion: '1.0.0',
                  status: 'ONLINE',
                  cpuUsage: 22,
                  memoryUsage: 48,
                  diskUsage: 35,
                  createdAt: '2026-11-26T09:00:00Z',
                },
              ],
            },
          });
        case '/anomalies':
          return Promise.resolve({ data: { data: [] } });
        case '/recovery':
          return Promise.resolve({
            data: {
              data: [
                {
                  id: 5,
                  incidentId: 10,
                  actionType: 'RUN_HEALTH_PROBE',
                  riskLevel: 'LOW',
                  status: 'VERIFIED',
                  requiresApproval: false,
                  verificationStatus: 'VERIFIED',
                  initiatedAt: '2026-11-26T10:05:00Z',
                },
              ],
            },
          });
        case '/recovery/recommendations':
          return Promise.resolve({ data: { data: [] } });
        case '/monitoring/system/latest':
          return Promise.resolve({
            data: {
              data: {
                id: 1,
                hostName: 'local-win11',
                cpuPercent: 18.4,
                memoryPercent: 61.2,
                diskPercent: 44.0,
                netRecvRateBps: 2048,
                netSentRateBps: 1024,
                collectedAt: '2026-11-26T10:10:00Z',
              },
            },
          });
        case '/monitoring/system/history':
          return Promise.resolve({ data: { data: [] } });
        case '/monitoring/collector/status':
          return Promise.resolve({
            data: {
              data: {
                status: 'HEALTHY',
                enabled: true,
                intervalSeconds: 10,
                retentionHours: 24,
                totalCollections: 12,
                hostDataAvailable: true,
                processDataAvailable: true,
                dockerAvailable: false,
              },
            },
          });
        case '/monitoring/docker/containers':
          return Promise.resolve({
            data: { data: { available: false, statusMessage: 'Offline', containers: [] } },
          });
        case '/agents/status':
          return Promise.resolve({
            data: { data: { reachable: true } },
          });
        default:
          return Promise.resolve({ data: { data: [] } });
      }
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('RESILIENCE COMMAND CENTER')).toBeInTheDocument();
    });

    expect(screen.getByText('Autonomous Self-Healing Lifecycle')).toBeInTheDocument();
    expect(screen.getByText('DETECT')).toBeInTheDocument();
    expect(screen.getByText('DIAGNOSE')).toBeInTheDocument();
    expect(screen.getByText('RECOMMEND')).toBeInTheDocument();
    expect(screen.getByText('EXECUTE')).toBeInTheDocument();
    expect(screen.getByText('VERIFY')).toBeInTheDocument();
    expect(screen.getByText('RESOLVE')).toBeInTheDocument();

    expect(screen.getByText(/1 critical incident active/i)).toBeInTheDocument();
    expect(screen.getByText('AI ENGINE ONLINE')).toBeInTheDocument();
    expect(screen.getByText('2/3')).toBeInTheDocument();
    expect(screen.getByText('Heap exhaustion in worker service')).toBeInTheDocument();
    expect(screen.getByText('RUN_HEALTH_PROBE')).toBeInTheDocument();
    expect(screen.getByText('CPU saturation on prod-node-01')).toBeInTheDocument();
    expect(screen.getAllByText('N/A').length).toBeGreaterThanOrEqual(2);
  });

  it('shows honest empty state in AI Intelligence when no insights exist', async () => {
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === '/dashboard/summary') {
        return Promise.resolve({
          data: {
            data: {
              totalApplications: 1,
              healthyApplications: 1,
              unhealthyApplications: 0,
              activeIncidents: 0,
              recoverySuccessRate: null,
              avgRecoveryTimeSeconds: null,
              avgCpuUsage: 10,
              avgMemoryUsage: 20,
              recentApplications: [],
              recentIncidents: [],
            },
          },
        });
      }
      if (url === '/agents/status') {
        return Promise.resolve({ data: { data: { reachable: false } } });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('No AI insights available yet.')).toBeInTheDocument();
    });
    expect(screen.getByText('FALLBACK MODE')).toBeInTheDocument();
  });

  it('shows error banner and retries when backend is unreachable', async () => {
    (apiClient.get as any).mockRejectedValueOnce(new Error('Network down'));

    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Unable to connect to SHARP backend service.')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
