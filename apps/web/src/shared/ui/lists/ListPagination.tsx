import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ListPaginationProps {
  page: number;
  totalPages: number;
  total?: number;
  pageSize?: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export const ListPagination: React.FC<ListPaginationProps> = ({
  page,
  totalPages,
  total,
  pageSize = 10,
  onPrevious,
  onNext,
  className = '',
}) => {
  const displayTotalPages = totalPages > 0 ? totalPages : 1;
  const rangeStart = total && total > 0 ? (page - 1) * pageSize + 1 : 0;
  const rangeEnd = total ? Math.min(page * pageSize, total) : 0;

  return (
    <div className={`flex items-center justify-between ${className}`}>
      <span className="text-sm text-slate-600">
        {total != null && total > 0
          ? `${rangeStart}–${rangeEnd} de ${total} · Página ${page} de ${displayTotalPages}`
          : `Página ${page} de ${displayTotalPages}`}
      </span>
      <div className="flex space-x-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={onPrevious}
          className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          aria-label="Página anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          disabled={totalPages > 0 ? page >= totalPages : false}
          onClick={onNext}
          className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          aria-label="Próxima página"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
