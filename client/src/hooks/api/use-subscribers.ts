import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Subscriber } from '@/lib/types';

export function useSubscribers(companyId?: string) {
    return useQuery({
        queryKey: ['subscribers', companyId],
        queryFn: async () => {
            // Build query parameters
            const queryParams: Record<string, any> = {};
            if (companyId) {
                queryParams.companyId = companyId;
            }
            
            const response = await api.get('/subscribers', { params: queryParams });
            return response.data.data as Subscriber[];
        },
        enabled: !!companyId, // Only run if companyId is available
    });
}
