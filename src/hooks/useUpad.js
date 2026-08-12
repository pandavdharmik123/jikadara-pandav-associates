import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Fetch all Upad records with optional filters
 */
export const useUpads = (filters = {}) => {
  const { userName = '', startDate = '', endDate = '', fyStartDate = '', fyEndDate = '', search = '' } = filters;
  return useQuery({
    queryKey: ['upads', userName, startDate, endDate, fyStartDate, fyEndDate, search],
    queryFn: async () => {
      const params = {};
      if (userName && userName !== 'ALL') params.userName = userName;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (fyStartDate) params.fyStartDate = fyStartDate;
      if (fyEndDate) params.fyEndDate = fyEndDate;
      if (search) params.search = search;

      const { data } = await api.get('/upad', { params });
      return data;
    },
  });
};

/**
 * Create a new Upad entry
 */
export const useCreateUpad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/upad', payload);
      return data.upad;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upads'] });
    },
  });
};

/**
 * Update an existing Upad entry
 */
export const useUpdateUpad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/upad/${id}`, payload);
      return data.upad;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upads'] });
    },
  });
};

/**
 * Delete an Upad entry
 */
export const useDeleteUpad = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/upad/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['upads'] });
    },
  });
};
