import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useGenericQuery<T>(endpoint: string | null, companyId?: string, params?: Record<string, any>) {
    // Build a stable query key. `params` is only appended when present so that
    // `[endpoint, companyId]` (used by invalidateQueries calls across the app)
    // reliably prefix-matches the active query key.
    const queryKey = params
        ? [endpoint, companyId, params]
        : [endpoint, companyId];

    return useQuery({
        queryKey,
        queryFn: async () => {
            if (!endpoint) return [];

            // Build query parameters
            const queryParams: Record<string, any> = { ...params };
            if (companyId) {
                queryParams.companyId = companyId;
            }

            const response = await api.get(endpoint.startsWith('/') ? endpoint : `/${endpoint}`, { params: queryParams });
            // Extract the data array from the response
            return response.data.data as T;
        },
        enabled: !!endpoint, // Allow query to run even without companyId for testing
    });
}
