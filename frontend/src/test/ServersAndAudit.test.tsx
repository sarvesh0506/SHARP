import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ServersPage } from '../pages/ServersPage';
import { AuditPage } from '../pages/AuditPage';
import { serversApi } from '../api/servers';
import { auditApi } from '../api/audit';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 1, username: 'admin', email: 'admin@sharp.local', role: 'ROLE_ADMIN' },
    isAdmin: true,
    isAuthenticated: true,
  }),
}));

vi.mock('../api/servers', () => ({
  serversApi: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../api/audit', () => ({
  auditApi: {
    listPaged: vi.fn(),
  },
}));

describe('Servers CRUD & Audit Pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('supports listing, editing, and deleting a server with confirmation', async () => {
    (serversApi.list as any).mockResolvedValue([
      {
        id: 10,
        hostName: 'prod-node-01',
        ipAddress: '192.168.10.15',
        osType: 'Ubuntu 22.04',
        agentVersion: '1.0.0',
        status: 'ONLINE',
        cpuUsage: 15,
        memoryUsage: 40,
        diskUsage: 30,
        createdAt: '2026-11-26T10:00:00Z',
      },
    ]);
    (serversApi.update as any).mockResolvedValue({
      id: 10,
      hostName: 'prod-node-01-v2',
      ipAddress: '192.168.10.15',
      osType: 'Ubuntu 22.04',
      agentVersion: '1.1.0',
      status: 'DEGRADED',
    });
    (serversApi.remove as any).mockResolvedValue(undefined);

    render(<ServersPage />);

    await waitFor(() => {
      expect(screen.getByText('prod-node-01')).toBeInTheDocument();
    });

    // Edit flow
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    fireEvent.change(screen.getByLabelText(/host name/i), {
      target: { value: 'prod-node-01-v2' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(serversApi.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ hostName: 'prod-node-01-v2' })
      );
    });

    // Delete flow with ConfirmDialog
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(screen.getByText('Delete Monitored Host')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /delete host/i }));

    await waitFor(() => {
      expect(serversApi.remove).toHaveBeenCalledWith(10);
    });
  });

  it('shows error banner and retries on ServersPage failure', async () => {
    (serversApi.list as any)
      .mockRejectedValueOnce({ response: { data: { message: 'Server registry down' } } })
      .mockResolvedValueOnce([]);

    render(<ServersPage />);

    await waitFor(() => {
      expect(screen.getByText('Server registry down')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Retry'));

    await waitFor(() => {
      expect(screen.getByText('No servers registered yet')).toBeInTheDocument();
    });
  });

  it('requests server-side pages and filters on AuditPage', async () => {
    (auditApi.listPaged as any)
      .mockResolvedValueOnce({
        items: [
          {
            id: 1,
            username: 'admin',
            action: 'USER_LOGIN',
            resourceType: 'USER',
            resourceId: '1',
            details: 'Logged in',
            ipAddress: '127.0.0.1',
            timestamp: '2026-11-26T10:00:00Z',
          },
        ],
        totalElements: 25,
        totalPages: 2,
        page: 0,
        size: 20,
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 21,
            username: 'operator',
            action: 'SERVER_UPDATED',
            resourceType: 'INFRASTRUCTURE',
            resourceId: '3',
            details: 'Updated host',
            ipAddress: '127.0.0.1',
            timestamp: '2026-11-26T09:00:00Z',
          },
        ],
        totalElements: 25,
        totalPages: 2,
        page: 1,
        size: 20,
      });

    render(<AuditPage />);

    await waitFor(() => {
      expect(screen.getByText('Page 1 of 2 (25 total)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /next/i }));

    await waitFor(() => {
      expect(auditApi.listPaged).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1, size: 20 })
      );
      expect(screen.getByText('Page 2 of 2 (25 total)')).toBeInTheDocument();
    });
  });
});
