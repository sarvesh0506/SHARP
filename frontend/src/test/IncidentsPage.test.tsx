import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { IncidentsPage } from '../pages/IncidentsPage';
import apiClient from '../api/client';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAdmin: true,
    user: { username: 'admin', role: 'ROLE_ADMIN' },
  }),
}));

vi.mock('../contexts/LiveEventsContext', () => ({
  useLiveEvents: () => ({
    subscribe: () => () => {},
  }),
}));

describe('Phase UI-2: IncidentsPage Investigation Experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === '/incidents') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 101,
                title: 'CPU saturation on prod-node-01',
                description: 'Sustained CPU usage above 92%',
                severity: 'CRITICAL',
                status: 'OPEN',
                affectedResource: 'prod-node-01',
                detectedByAgent: 'FaultDetector',
                openedAt: new Date(Date.now() - 3600_000).toISOString(),
                rootCause: 'Runaway Java worker thread pool',
              },
              {
                id: 102,
                title: 'Disk warning on prod-node-02',
                description: 'Disk usage at 81%',
                severity: 'MEDIUM',
                status: 'RESOLVED',
                affectedResource: 'prod-node-02',
                detectedByAgent: 'FaultDetector',
                openedAt: new Date(Date.now() - 7200_000).toISOString(),
                resolvedAt: new Date(Date.now() - 3000_000).toISOString(),
                resolutionNotes: 'Cleaned old logs',
              },
            ],
          },
        });
      }
      if (url === '/anomalies') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 11,
                incidentId: 101,
                metricName: 'cpu.usage',
                observedValue: 94.2,
                baselineValue: 41.0,
                detectionMethod: 'Z_SCORE',
                detectedAt: new Date(Date.now() - 3500_000).toISOString(),
              },
            ],
          },
        });
      }
      if (url === '/rca/incident/101') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 8,
                incidentId: 101,
                rootCause: 'Runaway Java worker thread pool',
                analysisMode: 'DETERMINISTIC_FALLBACK',
                createdAt: new Date(Date.now() - 3400_000).toISOString(),
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('renders filters, connected investigation chain, and chronological timeline', async () => {
    render(
      <MemoryRouter>
        <IncidentsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('#101 · CPU saturation on prod-node-01')).toBeInTheDocument();
    });

    // Connected chain and timeline visible for #101
    expect(screen.getByText(/Linked Anomalies \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Runaway Java worker thread pool')).toBeInTheDocument();
    expect(screen.getByText('Incident Detected')).toBeInTheDocument();
    expect(screen.getByText(/Anomaly: cpu.usage/i)).toBeInTheDocument();

    // Filter by severity MEDIUM
    fireEvent.change(screen.getByLabelText('Filter by severity'), {
      target: { value: 'MEDIUM' },
    });
    expect(screen.queryByText('#101 · CPU saturation on prod-node-01')).not.toBeInTheDocument();
    expect(screen.getByText('#102 · Disk warning on prod-node-02')).toBeInTheDocument();

    // Clear filters restores both
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(screen.getByText('#101 · CPU saturation on prod-node-01')).toBeInTheDocument();
  });
});
