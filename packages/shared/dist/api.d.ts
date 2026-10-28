export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: unknown;
    };
    meta?: {
        cached?: boolean;
        provider?: string;
        quotaRemaining?: number;
        timestamp: string;
    };
}
export interface HealthCheckData {
    status: 'ok' | 'degraded' | 'down';
    service: string;
    version: string;
    timestamp: string;
    uptime: number;
}
