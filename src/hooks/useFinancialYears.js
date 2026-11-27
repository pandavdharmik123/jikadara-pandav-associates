import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import useAuthStore from '../store/authStore';

export const useFinancialYears = () => {
  return useQuery({
    queryKey: ['financialYears'],
    queryFn: async () => {
      const { data } = await api.get('/financialYears');
      return data;
    },
  });
};

function invalidateFyDependentQueries(queryClient) {
  queryClient.invalidateQueries({ queryKey: ['financialYears'] });
  queryClient.invalidateQueries({
    predicate: (query) => query.queryKey?.[0] !== 'financialYears' && query.queryKey?.[0] !== 'auth',
  });
}

export const useCreateFinancialYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/financialYears', payload);
      return data;
    },
    onSuccess: (created) => {
      const { activeFinancialYear, setActiveFinancialYear } = useAuthStore.getState();
      if (!activeFinancialYear && created) {
        setActiveFinancialYear(created);
      }
      invalidateFyDependentQueries(queryClient);
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
    onSuccess: (updated) => {
      const { activeFinancialYear, setActiveFinancialYear } = useAuthStore.getState();
      if (updated && activeFinancialYear?.id === updated.id) {
        setActiveFinancialYear(updated);
      }
      invalidateFyDependentQueries(queryClient);
    },
  });
};

export const useDeleteFinancialYear = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/financialYears/${id}`);
      return { id, data };
    },
    onSuccess: ({ id }) => {
      const { activeFinancialYear, setActiveFinancialYear } = useAuthStore.getState();
      if (activeFinancialYear?.id === id) {
        setActiveFinancialYear(null);
      }
      invalidateFyDependentQueries(queryClient);
    },
  });
};
