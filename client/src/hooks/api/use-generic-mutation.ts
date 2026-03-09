import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

interface GenericMutationOptions {
    url: string;
    method: 'POST' | 'PUT' | 'DELETE';
    queryKey?: any[];
}

export function useGenericMutation<T>(options: GenericMutationOptions) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: T) => {
            let response;
            
            if (options.method === 'POST') {
                response = await api.post(options.url, data);
            } else if (options.method === 'PUT') {
                const id = (data as any).id;
                const url = options.url.endsWith('/') ? `${options.url}${id}` : `${options.url}/${id}`;
                response = await api.put(url, data);
            } else if (options.method === 'DELETE') {
                const id = data as string;
                const url = options.url.endsWith('/') ? `${options.url}${id}` : `${options.url}/${id}`;
                response = await api.delete(url);
            }
            
            return response.data;
        },
        onSuccess: () => {
            // Invalidate related queries to refetch data
            if (options.queryKey) {
                queryClient.invalidateQueries({ queryKey: options.queryKey });
            }
        },
    });
}
