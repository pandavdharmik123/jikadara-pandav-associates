import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import usePreferencesStore from '../store/preferencesStore';
import { getFinancialYearRange, getISTToday } from '../lib/date';

export const useFinancialYears = () => {
  return useQuery({
    queryKey: ['financial-years'],
    queryFn: async () => {
      const { data } = await api.get('/financialYears');
      return Array.isArray(data) ? data : [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Resolve the active financial year using the same rules a user expects:
 * last explicit choice → FY containing today → default FY → newest FY.
 */
export function useActiveFinancialYear() {
  const query = useFinancialYears();
  const selectedFyId = usePreferencesStore((state) => state.selectedFyId);
  const setSelectedFyId = usePreferencesStore((state) => state.setSelectedFyId);

  const fy = useMemo(() => {
    const years = query.data || [];
    if (years.length === 0) return null;

    const selected = selectedFyId ? years.find((year) => year.id === selectedFyId) : null;
    if (selected) return selected;

    const today = getISTToday().format('YYYY-MM-DD');
    const current = years.find((year) => {
      const range = getFinancialYearRange(year);
      return range && today >= range.startDate && today <= range.endDate;
    });
    if (current) return current;

    return years.find((year) => year.isDefault) || years[0];
  }, [query.data, selectedFyId]);

  const fyRange = useMemo(() => getFinancialYearRange(fy), [fy]);

  return {
    financialYears: query.data || [],
    fy,
    fyRange,
    selectFy: setSelectedFyId,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
