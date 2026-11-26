import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ServersPage } from '../pages/ServersPage';
import { serversApi } from '../api/servers';
import apiClient from '../api/client';

vi.mock('../api/servers', () => ({
  serversApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAdmin: true,
    user: { username: 'admin', role: 'ROLE_ADMIN' },
  }),
}));

describe('Phase UI-3: ServersPage Infrastructure Detail Experience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (serversApi.list as any).mockResolvedValue([
      {
        id: 1,
        hostName: 'prod-node-01',
        ipAddress: '10.0.0.10',
        osType: 'Ubuntu 22.04 LTS',
        agentVersion: '1.2.0',
        status: 'DEGRADED',
        cpuUsage: 91,
        memoryUsage: 65,
        diskUsage: 42,
        lastSeen: '2026-11-26T12:00:00Z',
      },
    ]);
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === '/monitoring/processes') return Promise.resolve({ data: { data: [{ pid: 100, name: 'java' }] } });
      if (url === '/monitoring/docker/containers') return Promise.resolve({ data: { data: [{ id: 'c1' }] } });
      if (url === '/applications') return Promise.resolve({ data: { data: [{ id: 1, name: 'api' }] } });
      if (url === '/incidents') return Promise.resolve({ data: { data: [{ id: 5, status: 'OPEN' }] } });
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('displays degradation reason and opens comprehensive infrastructure detail modal', async () => {
    render(
      <MemoryRouter>
        <ServersPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('prod-node-01')).toBeInTheDocument();
    });

    expect(screen.getByText('Node is reporting a degraded operational state.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /details/i }));

    await waitFor(() => {
      expect(screen.getByText('Health Degradation Factors')).toBeInTheDocument();
      expect(screen.getByText('High CPU utilization (91%).')).toBeInTheDocument();
      expect(screen.getByText('1 Processes')).toBeInTheDocument();
      expect(screen.getByText('1 Containers')).toBeInTheDocument();
      expect(screen.getByText('1 Apps')).toBeInTheDocument();
    });
  });
});
