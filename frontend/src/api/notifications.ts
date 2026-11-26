import apiClient from './client';
import { ApiResponse, NotificationItem, NotificationPageResponse } from '../types';

export interface ListNotificationsParams {
  isRead?: boolean;
  type?: string;
  page?: number;
  size?: number;
}

export const notificationsApi = {
  async listNotifications(params: ListNotificationsParams = {}): Promise<NotificationPageResponse> {
    const query: Record<string, string | number | boolean> = {
      page: params.page ?? 0,
      size: params.size ?? 20,
    };
    if (params.isRead !== undefined) {
      query.isRead = params.isRead;
    }
    if (params.type && params.type !== 'ALL') {
      query.type = params.type;
    }
    const res = await apiClient.get<ApiResponse<NotificationPageResponse>>('/notifications', {
      params: query,
    });
    return res.data.data;
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiClient.get<ApiResponse<{ unreadCount: number }>>('/notifications/unread-count');
    return res.data.data?.unreadCount ?? 0;
  },

  async markAsRead(id: number): Promise<NotificationItem> {
    const res = await apiClient.put<ApiResponse<NotificationItem>>(`/notifications/${id}/read`);
    return res.data.data;
  },

  async markAllAsRead(): Promise<number> {
    const res = await apiClient.put<ApiResponse<{ updated: number }>>('/notifications/read-all');
    return res.data.data?.updated ?? 0;
  },

  async deleteNotification(id: number): Promise<void> {
    await apiClient.delete(`/notifications/${id}`);
  },

  async deleteAllNotifications(): Promise<number> {
    const res = await apiClient.delete<ApiResponse<{ deleted: number }>>('/notifications');
    return res.data.data?.deleted ?? 0;
  },
};
