import apiClient from './client';
import {
  AnomalyEvent,
  ApiResponse,
  Application,
  Incident,
  RecoveryAction,
  SystemMetric,
} from '../types';

export type TelemetryWindow = '15m' | '1h' | '6h' | '24h';

const WINDOW_HOURS: Record<TelemetryWindow, number> = {
  '15m': 0.25,
  '1h': 1,
  '6h': 6,
  '24h': 24,
};

export interface AnalyticsBundle {
  incidents: Incident[];
  actions: RecoveryAction[];
  applications: Application[];
  anomalies: AnomalyEvent[];
}

export const analyticsApi = {
  async fetchAnalyticsBundle(): Promise<AnalyticsBundle> {
    const [incRes, recRes, appRes, anomRes] = await Promise.all([
      apiClient.get<ApiResponse<Incident[]>>('/incidents'),
      apiClient.get<ApiResponse<RecoveryAction[]>>('/recovery'),
      apiClient.get<ApiResponse<Application[]>>('/applications'),
      apiClient.get<ApiResponse<AnomalyEvent[]>>('/anomalies'),
    ]);
    return {
      incidents: incRes.data?.data ?? [],
      actions: recRes.data?.data ?? [],
      applications: appRes.data?.data ?? [],
      anomalies: anomRes.data?.data ?? [],
    };
  },

  async fetchSystemHistory(window: TelemetryWindow, limit = 200): Promise<SystemMetric[]> {
    const to = new Date();
    const from = new Date(to.getTime() - WINDOW_HOURS[window] * 3600 * 1000);
    const res = await apiClient.get<ApiResponse<SystemMetric[]>>('/monitoring/system/history', {
      params: {
        from: from.toISOString(),
        to: to.toISOString(),
        limit,
      },
    });
    return res.data?.data ?? [];
  },
};
