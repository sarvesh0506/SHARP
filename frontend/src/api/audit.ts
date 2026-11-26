import apiClient from './client';
import { ApiResponse, AuditPageResponse } from '../types';

export interface ListAuditParams {
  search?: string;
  action?: string;
  from?: string;
  to?: string;
  sortDir?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export const auditApi = {
  async listPaged(params: ListAuditParams = {}): Promise<AuditPageResponse> {
    const query: Record<string, string | number> = {
      sortDir: params.sortDir ?? 'desc',
      page: params.page ?? 0,
      size: params.size ?? 20,
    };
    if (params.search && params.search.trim()) {
      query.search = params.search.trim();
    }
    if (params.action && params.action !== 'ALL') {
      query.action = params.action;
    }
    if (params.from) {
      query.from = params.from;
    }
    if (params.to) {
      query.to = params.to;
    }
    const res = await apiClient.get<ApiResponse<AuditPageResponse>>('/audit/paged', {
      params: query,
    });
    return res.data.data;
  },
};
