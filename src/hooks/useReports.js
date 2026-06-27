import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export const useDashboardStats = (fyStartDate, fyEndDate) => {
  return useQuery({
    queryKey: ['dashboard', 'stats', fyStartDate, fyEndDate],
    queryFn: async () => {
      const params = {};
      if (fyStartDate) params.fyStartDate = fyStartDate;
      if (fyEndDate) params.fyEndDate = fyEndDate;
      const { data } = await api.get('/reports/dashboard', { params });
      return data.stats;
    },
  });
};

export const useRecentData = (fyStartDate, fyEndDate) => {
  return useQuery({
    queryKey: ['dashboard', 'recent', fyStartDate, fyEndDate],
    queryFn: async () => {
      const params = {};
      if (fyStartDate) params.fyStartDate = fyStartDate;
      if (fyEndDate) params.fyEndDate = fyEndDate;
      const { data } = await api.get('/reports/recent', { params });
      return data;
    },
  });
};

export const useMonthlyReport = (fyStartDate, fyEndDate, year, month) => {
  return useQuery({
    queryKey: ['report', 'monthly', fyStartDate, fyEndDate, year, month],
    queryFn: async () => {
      const params = { year, month };
      if (fyStartDate) params.fyStartDate = fyStartDate;
      if (fyEndDate) params.fyEndDate = fyEndDate;
      const { data } = await api.get('/reports/monthly', { params });
      return data;
    },
    enabled: !!year && !!month,
  });
};

export const useYearlyReport = (fyStartDate, fyEndDate, year) => {
  return useQuery({
    queryKey: ['report', 'yearly', fyStartDate, fyEndDate, year],
    queryFn: async () => {
      const params = {};
      if (fyStartDate) params.fyStartDate = fyStartDate;
      if (fyEndDate) params.fyEndDate = fyEndDate;
      if (year) params.year = year;
      const { data } = await api.get('/reports/yearly', { params });
      return data;
    },
    enabled: !!fyStartDate || !!year,
  });
};
