import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GlobalSearchModal } from '../components/layout/GlobalSearchModal';
import apiClient from '../api/client';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../contexts/AuthContext', () => ({
  useAuth: () => ({
    isAdmin: false,
    user: { username: 'operator', role: 'ROLE_OPERATOR' },
  }),
}));

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('Phase UI-1: GlobalSearchModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (apiClient.get as any).mockImplementation((url: string) => {
      if (url === '/servers') {
        return Promise.resolve({
          data: {
            data: [
              { id: 1, hostname: 'prod-node-01', ipAddress: '10.0.0.12', operatingSystem: 'Windows 11', status: 'ONLINE' },
            ],
          },
        });
      }
      if (url === '/incidents') {
        return Promise.resolve({
          data: {
            data: [
              { id: 42, title: 'High CPU spike on prod-node-01', severity: 'HIGH', status: 'OPEN' },
            ],
          },
        });
      }
      if (url === '/recovery/recommendations') {
        return Promise.resolve({
          data: {
            data: [
              { id: 7, incidentId: 42, actionType: 'CLEAR_TEMP_CACHE', actionName: 'Clear Temp Cache', riskLevel: 'LOW', status: 'PENDING' },
            ],
          },
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });
  });

  it('filters categorized results for "recovery" and navigates on Enter', async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <GlobalSearchModal open onClose={onClose} />
      </MemoryRouter>
    );

    const input = screen.getByLabelText('Search SHARP');
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/servers');
    });

    fireEvent.change(input, { target: { value: 'recovery' } });

    expect(
      screen.getByText((_, node) => node?.tagName === 'SPAN' && node.textContent === 'Recovery Management')
    ).toBeInTheDocument();
    expect(
      screen.getByText((_, node) => node?.tagName === 'SPAN' && node.textContent === 'Recovery History')
    ).toBeInTheDocument();
    expect(screen.getByText('Clear Temp Cache')).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/recovery/history');
  });

  it('shows empty state for unmatched queries and closes on Escape', async () => {
    const onClose = vi.fn();
    render(
      <MemoryRouter>
        <GlobalSearchModal open onClose={onClose} />
      </MemoryRouter>
    );

    const input = screen.getByLabelText('Search SHARP');
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/servers');
    });
    fireEvent.change(input, { target: { value: 'xyznonexistent999' } });

    expect(
      screen.getByText(/No matching SHARP entities or routes for "xyznonexistent999"/i)
    ).toBeInTheDocument();

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
