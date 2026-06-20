import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/reports/dashboard');
      return data.stats;
    },
  });
};

export const useRecentData = () => {
  return useQuery({
    queryKey: ['dashboard', 'recent'],
    queryFn: async () => {
      const { data } = await api.get('/reports/recent');
      return data;
    },
  });
};

export const useMonthlyReport = (year, month) => {
  return useQuery({
    queryKey: ['report', 'monthly', year, month],
    queryFn: async () => {
      const { data } = await api.get('/reports/monthly', { params: { year, month } });
      return data;
    },
    enabled: !!year && !!month,
  });
};

export const useYearlyReport = (year) => {
  return useQuery({
    queryKey: ['report', 'yearly', year],
    queryFn: async () => {
      const { data } = await api.get('/reports/yearly', { params: { year } });
      return data;
    },
    enabled: !!year,
  });
};
