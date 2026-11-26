import React from 'react';
import { EmptyState } from './EmptyState';
import { SkeletonTable } from './Skeleton';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  skeletonRows?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading = false,
  skeletonRows = 5,
  emptyTitle = 'No records found',
  emptyDescription,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  if (loading) {
    return <SkeletonTable rows={skeletonRows} columns={columns.length} />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  const alignClass = (align?: 'left' | 'right' | 'center') =>
    align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';

  return (
    <div className={`sharp-card overflow-hidden ${className}`.trim()}>
      <div className="sharp-table-wrap">
        <table className="sharp-table">
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`${alignClass(col.align)} ${col.className || ''}`.trim()}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer' : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`${alignClass(col.align)} ${col.className || ''}`.trim()}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
