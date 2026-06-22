import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useGenericQuery<T>(endpoint: string | null, companyId?: string, params?: Record<string, any>) {
    return useQuery({
        queryKey: [endpoint, companyId, params],
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
