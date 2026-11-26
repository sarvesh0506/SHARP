import apiClient from './client';
import { ApiResponse, UserPageResponse, UserRole, UserSummary } from '../types';

export interface ListUsersParams {
  search?: string;
  role?: string;
  enabled?: boolean;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export const usersApi = {
  async listUsers(params: ListUsersParams = {}): Promise<UserPageResponse> {
    const query: Record<string, string | number | boolean> = {
      sortBy: params.sortBy ?? 'id',
      sortDir: params.sortDir ?? 'asc',
      page: params.page ?? 0,
      size: params.size ?? 20,
    };
    if (params.search && params.search.trim()) {
      query.search = params.search.trim();
    }
    if (params.role && params.role !== 'ALL') {
      query.role = params.role;
    }
    if (params.enabled !== undefined) {
      query.enabled = params.enabled;
    }
    const res = await apiClient.get<ApiResponse<UserPageResponse>>('/users', { params: query });
    return res.data.data;
  },

  async getUserById(id: number): Promise<UserSummary> {
    const res = await apiClient.get<ApiResponse<UserSummary>>(`/users/${id}`);
    return res.data.data;
  },

  async updateUserRole(id: number, role: UserRole): Promise<ApiResponse<UserSummary>> {
    const res = await apiClient.put<ApiResponse<UserSummary>>(`/users/${id}/role`, { role });
    return res.data;
  },

  async updateUserStatus(id: number, enabled: boolean): Promise<ApiResponse<UserSummary>> {
    const res = await apiClient.put<ApiResponse<UserSummary>>(`/users/${id}/status`, { enabled });
    return res.data;
  },
};
