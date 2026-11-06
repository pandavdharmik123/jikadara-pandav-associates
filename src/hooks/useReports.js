import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { toISTDateString } from '../utils/istDate';

export const useDashboardStats = (fyStartDate, fyEndDate) => {
  const sDate = toISTDateString(fyStartDate);
  const eDate = toISTDateString(fyEndDate);
  return useQuery({
    queryKey: ['dashboard', 'stats', sDate, eDate],
    queryFn: async () => {
      const params = {};
      if (sDate) params.fyStartDate = sDate;
      if (eDate) params.fyEndDate = eDate;
      const { data } = await api.get('/reports/dashboard', { params });
      return data.stats;
    },
  });
};

export const useRecentData = (fyStartDate, fyEndDate) => {
  const sDate = toISTDateString(fyStartDate);
  const eDate = toISTDateString(fyEndDate);
  return useQuery({
    queryKey: ['dashboard', 'recent', sDate, eDate],
    queryFn: async () => {
      const params = {};
      if (sDate) params.fyStartDate = sDate;
      if (eDate) params.fyEndDate = eDate;
      const { data } = await api.get('/reports/recent', { params });
      return data;
    },
  });
};

export const useMonthlyReport = (fyStartDate, fyEndDate, year, month) => {
  const sDate = toISTDateString(fyStartDate);
  const eDate = toISTDateString(fyEndDate);
  return useQuery({
    queryKey: ['report', 'monthly', sDate, eDate, year, month],
    queryFn: async () => {
      const params = { year, month };
      if (sDate) params.fyStartDate = sDate;
      if (eDate) params.fyEndDate = eDate;
      const { data } = await api.get('/reports/monthly', { params });
      return data;
    },
    enabled: !!year && !!month,
  });
};

export const useYearlyReport = (fyStartDate, fyEndDate, year) => {
  const sDate = toISTDateString(fyStartDate);
  const eDate = toISTDateString(fyEndDate);
  return useQuery({
    queryKey: ['report', 'yearly', sDate, eDate, year],
    queryFn: async () => {
      const params = {};
      if (sDate) params.fyStartDate = sDate;
      if (eDate) params.fyEndDate = eDate;
      if (year) params.year = year;
      const { data } = await api.get('/reports/yearly', { params });
      return data;
    },
    enabled: !!sDate || !!year,
  });
};
