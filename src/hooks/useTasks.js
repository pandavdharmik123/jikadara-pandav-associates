import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// Fetch all tasks (with optional filters)
export const useTasks = (clientId = '', status = '', startDate = '', endDate = '') => {
  return useQuery({
    queryKey: ['tasks', clientId, status, startDate, endDate],
    queryFn: async () => {
      const params = {};
      if (clientId) params.clientId = clientId;
      if (status) params.status = status;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
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
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
    },
  });
};

// Create a direct income task entry (for reports)
export const useCreateDirectIncome = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (incomeData) => {
      const { data } = await api.post('/tasks/income', incomeData);
      return data.task;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (data?.clientId) {
        queryClient.invalidateQueries({ queryKey: ['client', data.clientId] });
      }
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
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['client'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['recycleBin'] });
    },
  });
};

// Mark task as done
export const useMarkTaskDone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const id = typeof payload === 'object' ? payload.id : payload;
      const completedDate = typeof payload === 'object' ? payload.completedDate : undefined;
      const { data } = await api.patch(`/tasks/${id}/done`, { completedDate });
      return data.task;
    },
    onSuccess: (data, variables) => {
      const id = typeof variables === 'object' ? variables.id : variables;
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['client', data.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
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
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      queryClient.invalidateQueries({ queryKey: ['client', data.clientId] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
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
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

// Update a transaction
export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...transactionData }) => {
      const { data } = await api.put(`/transactions/${id}`, transactionData);
      return data.transaction;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
      queryClient.invalidateQueries({ queryKey: ['report'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['recycleBin'] });
    },
  });
};
