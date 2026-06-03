import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { pageCanvasClass, surfaceCardClass } from './surface-styles';

export interface DataGridColumn<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  headerClassName?: string;
}

export interface ResponsiveDataGridProps<T extends { id: string | number }> {
  data: T[];
  columns: DataGridColumn<T>[];
  renderMobileCard: (item: T) => React.ReactNode;
  /** First column title + secondary column titles (actions column is implicit). */
  mobileHeaderTitles?: string[];
  isLoading?: boolean;
  /** Width of the right section on mobile; must match cards (default 55%). */
  mobileRightWidth?: string;
  /** When set, rows/cards are clickable (use stopPropagation on action buttons). */
  onRowClick?: (item: T) => void;
}

function alignClass(align: DataGridColumn<unknown>['align'], isLast: boolean): string {
  const resolved = align ?? (isLast ? 'right' : 'left');
  if (resolved === 'center') return 'text-center';
  if (resolved === 'right') return 'text-right';
  return 'text-left';
}

export const ResponsiveDataGrid = <T extends { id: string | number }>({
  data,
  columns,
  renderMobileCard,
  mobileHeaderTitles = [],
  isLoading,
  mobileRightWidth = '55%',
  onRowClick,
}: ResponsiveDataGridProps<T>) => {
  if (isLoading) {
    return (
      <div className="relative h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const secondaryTitles = mobileHeaderTitles.slice(1);

  return (
    <div className="relative">
      {/* Desktop */}
      <div className={`mt-4 hidden overflow-hidden md:block ${surfaceCardClass}`}>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse">
            <colgroup>
              {columns.map((col, idx) => (
                <col
                  key={idx}
                  style={col.width ? { width: col.width } : undefined}
                />
              ))}
            </colgroup>
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${alignClass(col.align, idx === columns.length - 1)} ${col.headerClassName ?? ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                data.map((item) => (
                  <tr
                    key={item.id}
                    className={
                      onRowClick
                        ? 'cursor-pointer hover:bg-slate-50'
                        : 'hover:bg-slate-50'
                    }
                    onClick={onRowClick ? () => onRowClick(item) : undefined}
                  >
                    {columns.map((col, idx) => (
                      <td
                        key={idx}
                        className={`px-4 py-3 text-sm text-slate-700 align-middle ${alignClass(col.align, idx === columns.length - 1)} ${col.className ?? ''}`}
                      >
                        {col.accessor(item)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        {mobileHeaderTitles.length > 0 ? (
          <div
            className={`sticky top-0 z-10 flex items-center border-b border-slate-200/80 px-4 py-2 backdrop-blur-md ${pageCanvasClass}/95`}
          >
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-1 min-w-0 pl-2 truncate">
              {mobileHeaderTitles[0]}
            </span>
            <div
              className="flex items-center shrink-0 gap-2"
              style={{ width: mobileRightWidth }}
            >
              {secondaryTitles.map((title) => (
                <span
                  key={title}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex-1 text-center min-w-0 truncate"
                >
                  {title}
                </span>
              ))}
              <span className="w-16 shrink-0" aria-hidden />
            </div>
          </div>
        ) : null}

        <div className="space-y-3 px-4 pb-4 pt-2">
          {data.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              Nenhum registro encontrado.
            </p>
          ) : (
            data.map((item) => (
              <div
                key={item.id}
                className={`${surfaceCardClass} px-3 py-3 transition-shadow ${onRowClick ? 'cursor-pointer hover:shadow-md active:shadow' : ''}`}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(item);
                        }
                      }
                    : undefined
                }
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {renderMobileCard(item)}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
