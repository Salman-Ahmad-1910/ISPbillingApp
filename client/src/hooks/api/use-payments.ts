import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Payment } from '@/lib/types';

export function usePayments(companyId?: string) {
    return useQuery({
        queryKey: ['billing/payments', companyId],
        queryFn: async () => {
            const response = await api.get(`/billing/payments?companyId=${companyId}`);
            return response.data.data as Payment[];
        },
        enabled: !!companyId,
    });
}
