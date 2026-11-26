import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../components/ui/Button';
import { FormField, TextInput, SelectInput } from '../components/ui/FormField';
import { DataTable } from '../components/ui/DataTable';
import { Pagination } from '../components/ui/Pagination';
import { SkeletonCard, SkeletonTable } from '../components/ui/Skeleton';
import { Toast } from '../components/ui/Toast';
import { MetricBar } from '../components/ui/MetricBar';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

describe('Phase 5C-0 Design System Primitives', () => {
  it('renders Button variants and disables when loading', () => {
    const onClick = vi.fn();
    render(
      <div>
        <Button variant="primary" onClick={onClick}>
          Save Changes
        </Button>
        <Button variant="danger" loading>
          Deleting
        </Button>
      </div>
    );

    const saveBtn = screen.getByRole('button', { name: 'Save Changes' });
    fireEvent.click(saveBtn);
    expect(onClick).toHaveBeenCalledTimes(1);

    const loadingBtn = screen.getByRole('button', { name: 'Deleting' });
    expect(loadingBtn).toBeDisabled();
    expect(loadingBtn).toHaveAttribute('aria-busy', 'true');
  });

  it('renders FormField with error and accessible aria-invalid input', () => {
    render(
      <FormField label="Server Name" htmlFor="srv-name" required error="Hostname is required">
        <TextInput id="srv-name" hasError placeholder="prod-api-01" />
      </FormField>
    );

    const input = screen.getByPlaceholderText('prod-api-01');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Hostname is required');

    render(
      <FormField label="Environment" htmlFor="srv-env">
        <SelectInput id="srv-env">
          <option value="PROD">PROD</option>
        </SelectInput>
      </FormField>
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders DataTable rows, empty state, and loading skeleton', () => {
    const columns = [
      { key: 'name', header: 'Node', render: (r: { id: string; name: string }) => r.name },
    ];

    const { rerender } = render(
      <DataTable
        columns={columns}
        data={[{ id: '1', name: 'node-alpha' }]}
        rowKey={(r) => r.id}
      />
    );
    expect(screen.getByText('node-alpha')).toBeInTheDocument();

    rerender(
      <DataTable
        columns={columns}
        data={[]}
        rowKey={(r) => r.id}
        emptyTitle="No nodes available"
      />
    );
    expect(screen.getByText('No nodes available')).toBeInTheDocument();

    rerender(
      <DataTable columns={columns} data={[]} rowKey={(r) => r.id} loading />
    );
    expect(screen.getByLabelText('Loading table')).toBeInTheDocument();
  });

  it('renders Pagination and triggers page changes', () => {
    const onPageChange = vi.fn();
    render(
      <Pagination page={1} totalPages={3} totalItems={30} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByRole('button', { name: /prev/i }));
    expect(onPageChange).toHaveBeenCalledWith(0);

    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('renders SkeletonCard, SkeletonTable, Toast, MetricBar, and ConfirmDialog', () => {
    const onDismiss = vi.fn();
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <div>
        <SkeletonCard />
        <SkeletonTable rows={2} columns={2} />
        <Toast variant="success" title="Saved" message="Configuration updated" onDismiss={onDismiss} />
        <MetricBar label="CPU Load" value={42.5} />
        <ConfirmDialog
          open
          title="Confirm Action"
          description="Proceed with restart?"
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </div>
    );

    expect(screen.getByLabelText('Loading content')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Configuration updated');
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss message' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);

    const bar = screen.getByRole('progressbar', { name: 'CPU Load' });
    expect(bar).toHaveAttribute('aria-valuenow', '42.5');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
