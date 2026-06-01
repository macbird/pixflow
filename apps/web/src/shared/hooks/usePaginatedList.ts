import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { PaginatedResponse } from '@client-manager/shared';

export interface PaginatedListParams {
  page: number;
  pageSize: number;
  filter: string;
}

interface UsePaginatedListOptions<T> {
  queryKey: string[];
  queryFn: (params: PaginatedListParams) => Promise<PaginatedResponse<T>>;
  pageSize?: number;
}

export function usePaginatedList<T>({
  queryKey,
  queryFn,
  pageSize = 10,
}: UsePaginatedListOptions<T>) {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [...queryKey, page, filter],
    queryFn: () => queryFn({ page, pageSize, filter }),
    placeholderData: keepPreviousData,
  });

  const total = data?.total ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

  const setFilterAndResetPage = (value: string) => {
    setFilter(value);
    setPage(1);
  };

  const goToPreviousPage = () => setPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPage((p) => (totalPages > 0 ? Math.min(totalPages, p + 1) : p + 1));

  return {
    items: data?.data ?? [],
    total,
    totalPages,
    page,
    pageSize,
    filter,
    setFilter: setFilterAndResetPage,
    setPage,
    goToPreviousPage,
    goToNextPage,
    isLoading,
    isFetching,
  };
}
