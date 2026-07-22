import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

export function useGenericQuery<T>(endpoint: string | null, companyId?: string, params?: Record<string, any>) {
    const queryKey = params
        ? [endpoint, companyId, params]
        : [endpoint, companyId];

    return useQuery({
        queryKey,
        queryFn: async () => {
            if (!endpoint) return [] as T[];

            const queryParams: Record<string, any> = { ...params };
            if (companyId) {
                queryParams.companyId = companyId;
            }

            const response = await api.get(endpoint.startsWith('/') ? endpoint : `/${endpoint}`, { params: queryParams });
            return (response.data.data ?? []) as T[];
        },
        enabled: !!endpoint,
    });
}
