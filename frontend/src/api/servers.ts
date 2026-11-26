import apiClient from './client';
import { ApiResponse, MonitoredServer } from '../types';

export interface ServerPayload {
  hostName: string;
  ipAddress: string;
  osType: string;
  agentVersion: string;
  status?: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
}

export const serversApi = {
  async list(): Promise<MonitoredServer[]> {
    const res = await apiClient.get<ApiResponse<MonitoredServer[]>>('/servers');
    return res.data.data ?? [];
  },

  async getById(id: number): Promise<MonitoredServer> {
    const res = await apiClient.get<ApiResponse<MonitoredServer>>(`/servers/${id}`);
    return res.data.data;
  },

  async create(payload: ServerPayload): Promise<MonitoredServer> {
    const res = await apiClient.post<ApiResponse<MonitoredServer>>('/servers', payload);
    return res.data.data;
  },

  async update(id: number, payload: ServerPayload): Promise<MonitoredServer> {
    const res = await apiClient.put<ApiResponse<MonitoredServer>>(`/servers/${id}`, payload);
    return res.data.data;
  },

  async remove(id: number): Promise<void> {
    await apiClient.delete(`/servers/${id}`);
  },
};
