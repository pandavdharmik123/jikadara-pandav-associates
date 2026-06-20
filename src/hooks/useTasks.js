import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Fetch all tasks (with optional clientId and status filters)
export const useTasks = (clientId = '', status = '') => {
  return useQuery({
    queryKey: ['tasks', clientId, status],
    queryFn: async () => {
      const params = {};
      if (clientId) params.clientId = clientId;
      if (status) params.status = status;
      const { data } = await api.get('/tasks', { params });
      return data.tasks;
    },
  });
};

// Fetch a single task by ID
export const useTask = (id) => {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async () => {
      const { data } = await api.get(`/tasks/${id}`);
      return data.task;
    },
    enabled: !!id,
  });
};

// Create a new task
export const useCreateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskData) => {
      const { data } = await api.post('/tasks', taskData);
      return data.task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['client', data.clientId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// Update an existing task
export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...taskData }) => {
      const { data } = await api.put(`/tasks/${id}`, taskData);
      return data.task;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['client', data.clientId] });
    },
  });
};

// Delete a task
export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      await api.delete(`/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['client'] }); // invalidate all clients to update task counts
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// Mark task as done
export const useMarkTaskDone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/tasks/${id}/done`);
      return data.task;
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['client', data.clientId] });
    },
  });
};

// Reopen a task
export const useReopenTask = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const { data } = await api.patch(`/tasks/${id}/reopen`);
      return data.task;
    },
    onSuccess: (data, id) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['client', data.clientId] });
    },
  });
};

// Create a transaction
export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (transactionData) => {
      const { data } = await api.post('/transactions', transactionData);
      return data.transaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};

// Delete a transaction
export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, taskId }) => {
      await api.delete(`/transactions/${id}`);
      return { taskId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
};
