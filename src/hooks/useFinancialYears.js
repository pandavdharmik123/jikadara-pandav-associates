import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useFinancialYears = () => {
  return useQuery({
    queryKey: ['financialYears'],
    queryFn: async () => {
      const { data } = await api.get('/financialYears');
      return data;
    },
  });
};

export const useCreateFinancialYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/financialYears', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['financialYears']);
    },
  });
};

export const useUpdateFinancialYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/financialYears/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['financialYears']);
    },
  });
};

export const useDeleteFinancialYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/financialYears/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['financialYears']);
    },
  });
};
