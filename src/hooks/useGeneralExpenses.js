import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useGeneralExpenses = (startDate, endDate) => {
  return useQuery({
    queryKey: ['generalExpenses', { startDate, endDate }],
    queryFn: async () => {
      let url = '/general-expenses';
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      const { data } = await api.get(url);
      return data;
    },
    enabled: true,
  });
};

export const useCreateGeneralExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/general-expenses', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['generalExpenses']);
    },
  });
};

export const useUpdateGeneralExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/general-expenses/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['generalExpenses']);
    },
  });
};

export const useDeleteGeneralExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/general-expenses/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['generalExpenses']);
    },
  });
};
