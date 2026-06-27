import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

export const useDocumentTypes = () => {
  return useQuery({
    queryKey: ['documentTypes'],
    queryFn: async () => {
      const { data } = await api.get('/documentTypes');
      return data;
    },
  });
};

export const useCreateDocumentType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const { data } = await api.post('/documentTypes', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documentTypes']);
    },
  });
};

export const useUpdateDocumentType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await api.put(`/documentTypes/${id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documentTypes']);
    },
  });
};

export const useDeleteDocumentType = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.delete(`/documentTypes/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['documentTypes']);
    },
  });
};
