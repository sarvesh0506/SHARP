import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = 'h-4 w-full' }) => (
  <div aria-hidden="true" className={`sharp-skeleton ${className}`.trim()} />
);

export const SkeletonCard: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div
    aria-busy="true"
    aria-label="Loading content"
    className={`sharp-card p-5 space-y-3 ${className}`.trim()}
  >
    <Skeleton className="h-3.5 w-1/3" />
    <Skeleton className="h-7 w-1/2" />
    <div className="space-y-2 pt-1">
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton key={idx} className={idx === lines - 1 ? 'h-3 w-2/3' : 'h-3 w-full'} />
      ))}
    </div>
  </div>
);

export const SkeletonTable: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 5,
}) => (
  <div aria-busy="true" aria-label="Loading table" className="sharp-card overflow-hidden">
    <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-input)]/70 flex gap-4">
      {Array.from({ length: columns }).map((_, idx) => (
        <Skeleton key={idx} className="h-3 flex-1" />
      ))}
    </div>
    <div className="divide-y divide-[var(--border-subtle)]">
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="px-4 py-3.5 flex gap-4 items-center">
          {Array.from({ length: columns }).map((_, cIdx) => (
            <Skeleton key={cIdx} className="h-3.5 flex-1" />
          ))}
        </div>
      ))}
    </div>
  </div>
);
