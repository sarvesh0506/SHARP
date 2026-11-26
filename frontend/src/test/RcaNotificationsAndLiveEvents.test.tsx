import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RootCauseAnalysisPage } from '../pages/RootCauseAnalysisPage';
import { NotificationsPage } from '../pages/NotificationsPage';
import { LiveEventsPage } from '../pages/LiveEventsPage';
import apiClient from '../api/client';
import { notificationsApi } from '../api/notifications';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock('../api/notifications', () => ({
  notificationsApi: {
    listNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    deleteAllNotifications: vi.fn(),
  },
}));

const mockReconnect = vi.fn();
const mockClearEvents = vi.fn();
const mockSetPaused = vi.fn();

vi.mock('../contexts/LiveEventsContext', () => ({
  useLiveEvents: () => ({
    status: 'CONNECTED',
    events: [
      {
        id: 'ev-1',
        type: 'RCA_COMPLETED',
        timestamp: '2026-11-26T12:00:00Z',
        payload: { id: 1, hypothesis: 'High CPU saturation detected' },
      },
    ],
    lastEvent: null,
    paused: false,
    setPaused: mockSetPaused,
    clearEvents: mockClearEvents,
    reconnect: mockReconnect,
    subscribe: () => () => {},
  }),
}));

describe('RCA, Notifications & Live Events Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders RCA result and displays inline recommendation card after generation', async () => {
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === '/incidents') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 5,
                title: 'High CPU on host',
                description: 'CPU > 90%',
                severity: 'CRITICAL',
                status: 'OPEN',
                detectedByAgent: 'Detection Agent',
                rcaStatus: 'COMPLETED',
                openedAt: '2026-11-26T10:00:00Z',
              },
            ],
          },
        });
      }
      if (url === '/rca/incident/5') {
        return Promise.resolve({
          data: {
            data: [
              {
                id: 12,
                incidentId: 5,
                analysisMethod: 'AI_ANALYSIS',
                status: 'COMPLETED',
                hypothesis: 'Worker thread contention',
                recommendedActionType: 'RESTART_MONITORED_SERVICE',
                confidenceScore: 0.85,
                createdAt: '2026-11-26T10:01:00Z',
              },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    (apiClient.post as any).mockResolvedValueOnce({
      data: {
        data: {
          id: 99,
          incidentId: 5,
          actionType: 'RESTART_MONITORED_SERVICE',
          actionName: 'Restart Registered Application Component',
          riskLevel: 'MEDIUM',
          expectedResult: 'Resets hung worker threads',
          approvalRequired: true,
          status: 'PENDING',
          createdAt: '2026-11-26T10:02:00Z',
        },
      },
    });

    render(
      <MemoryRouter>
        <RootCauseAnalysisPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Worker thread contention')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /generate recovery recommendation/i }));

    await waitFor(() => {
      expect(screen.getByText('Recommendation #99 Created')).toBeInTheDocument();
      expect(screen.getByText(/RESTART_MONITORED_SERVICE · PENDING/)).toBeInTheDocument();
    });
  });

  it('handles notification mark-as-read and renders live WebSocket events', async () => {
    (notificationsApi.listNotifications as any).mockResolvedValue({
      items: [
        {
          id: 7,
          type: 'INCIDENT_CREATED',
          severity: 'HIGH',
          title: 'Incident #5 Opened',
          message: 'High CPU detected',
          incidentId: 5,
          read: false,
          createdAt: '2026-11-26T10:00:00Z',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      page: 0,
      size: 20,
    });
    (notificationsApi.getUnreadCount as any).mockResolvedValue(1);
    (notificationsApi.markAsRead as any).mockResolvedValue({});

    render(
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Incident #5 Opened')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /mark read/i }));
    await waitFor(() => {
      expect(notificationsApi.markAsRead).toHaveBeenCalledWith(7);
    });

    render(
      <MemoryRouter>
        <LiveEventsPage />
      </MemoryRouter>
    );

    expect(screen.getByText('CONNECTED')).toBeInTheDocument();
    expect(screen.getByText('RCA_COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('High CPU saturation detected')).toBeInTheDocument();
  });
});
