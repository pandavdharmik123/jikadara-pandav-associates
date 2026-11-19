import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Fetch all Nondh Status records with optional filters
 */
export const useNondhStatuses = (filters = {}) => {
  const { search = '', status = '', doneOrNot = '', referenceName = '' } = filters;
  return useQuery({
    queryKey: ['nondhStatuses', search, status, doneOrNot, referenceName],
    queryFn: async () => {
      const params = {};
      if (search) params.search = search;
      if (status) params.status = status;
      if (doneOrNot) params.doneOrNot = doneOrNot;
      if (referenceName) params.referenceName = referenceName;

      const { data } = await api.get('/nondh-status', { params });
      return data.nondhStatuses || [];
    },
  });
};

/**
 * Create a new Nondh Status record
 */
export const useCreateNondhStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/nondh-status', payload);
      return data.nondhStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nondhStatuses'] });
    },
  });
};

/**
 * Update an existing Nondh Status record
 */
export const useUpdateNondhStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/nondh-status/${id}`, payload);
      return data.nondhStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nondhStatuses'] });
    },
  });
};

/**
 * Delete a Nondh Status record (soft delete)
 */
export const useDeleteNondhStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/nondh-status/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nondhStatuses'] });
    },
  });
};
