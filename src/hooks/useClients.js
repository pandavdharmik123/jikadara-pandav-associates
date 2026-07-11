import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Fetch all clients (with optional search query)
export const useClients = (search = '', fyStartDate = '', fyEndDate = '') => {
  return useQuery({
    queryKey: ['clients', search, fyStartDate, fyEndDate],
    queryFn: async () => {
      const params = { search };
      if (fyStartDate) params.fyStartDate = fyStartDate;
      if (fyEndDate) params.fyEndDate = fyEndDate;
      const { data } = await api.get('/clients', { params });
      return data.clients;
    },
  });
};

// Fetch a single client by ID
export const useClient = (id, fyStartDate = '', fyEndDate = '') => {
  return useQuery({
    queryKey: ['client', id, fyStartDate, fyEndDate],
    queryFn: async () => {
      const params = {};
      if (fyStartDate) params.fyStartDate = fyStartDate;
      if (fyEndDate) params.fyEndDate = fyEndDate;
      const { data } = await api.get(`/clients/${id}`, { params });
      return data.client;
    },
    enabled: !!id,
  });
};

// Create a new client
export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (clientData) => {
      const { data } = await api.post('/clients', clientData);
      return data.client;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// Update an existing client
export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...clientData }) => {
      const { data } = await api.put(`/clients/${id}`, clientData);
      return data.client;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', variables.id] });
    },
  });
};

// Delete a client
export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
