import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (nextPage: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalItems,
  onPageChange,
  className = '',
}) => {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={`flex items-center justify-between gap-3 px-4 py-3 border-t border-[var(--border-subtle)] text-xs ${className}`.trim()}
    >
      <span className="font-mono text-[var(--text-muted)]">
        Page <strong className="text-[var(--text-main)]">{page + 1}</strong> of{' '}
        <strong className="text-[var(--text-main)]">{totalPages}</strong>
        {typeof totalItems === 'number' ? ` · ${totalItems} total` : ''}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 0}
          onClick={() => onPageChange(page - 1)}
          leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
        >
          Prev
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page + 1 >= totalPages}
          onClick={() => onPageChange(page + 1)}
          rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
        >
          Next
        </Button>
      </div>
    </nav>
  );
};
