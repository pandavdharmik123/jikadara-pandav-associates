import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { toISTDateString } from '../utils/istDate';

export const useGeneralExpenses = (startDate, endDate) => {
  const sDate = toISTDateString(startDate);
  const eDate = toISTDateString(endDate);
  return useQuery({
    queryKey: ['generalExpenses', { startDate: sDate, endDate: eDate }],
    queryFn: async () => {
      let url = '/general-expenses';
      const params = new URLSearchParams();
      if (sDate) params.append('startDate', sDate);
      if (eDate) params.append('endDate', eDate);
      
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
      queryClient.invalidateQueries({ queryKey: ['generalExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['generalExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['generalExpenses'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['recycleBin'] });
    },
  });
};
