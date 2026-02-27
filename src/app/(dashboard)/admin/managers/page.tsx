'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, RefreshCw } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { addToast, openModal, closeModal } from '@/store/slices/uiSlice';
import {
  useGetUsersQuery,
  useDeleteUserMutation,
  useOffboardUserMutation,
  useOnboardUserMutation,
  type UserData,
} from '@/store/slices/api/userApi';
import type { UserStatus } from '@/types';
import { useTranslation } from '@/i18n';
import {
  Button,
  Table,
  type TableColumn,
  SearchBar,
  Dropdown,
  Pagination,
  Badge,
  ConfirmDialog,
  LoadingSpinner,
} from '@/components/ui';

// ─── Constants ─────────────────────────────────────────

const STATUS_FILTER_ITEMS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Offboarded', value: 'offboarded' },
];

const LIMIT = 10;

const MODAL_OFFBOARD = 'confirm-offboard-manager';
const MODAL_DELETE = 'confirm-delete-manager';
const MODAL_ONBOARD = 'confirm-onboard-manager';

// ─── Component ─────────────────────────────────────────

export default function ManagersListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const user = useAppSelector((s) => s.auth.user);

  // ── Local State ─────────────────────────────────────
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // ── RTK Query Hooks ─────────────────────────────────
  const { data, isLoading, isFetching } = useGetUsersQuery({
    page,
    limit: LIMIT,
    search: search || undefined,
    role: 'manager',
    status: (statusFilter as UserStatus) || undefined,
    sortBy: sortKey,
    sortOrder,
  });

  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [offboardUser, { isLoading: isOffboarding }] = useOffboardUserMutation();
  const [onboardUser, { isLoading: isOnboarding }] = useOnboardUserMutation();

  // ── Handlers ────────────────────────────────────────
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusFilter = useCallback((value: string) => {
    setStatusFilter(value);
    setPage(1);
  }, []);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortKey(key);
    setSortOrder(order);
    setPage(1);
  }, []);

  const handleOffboard = useCallback(async () => {
    if (!selectedUser) return;
    try {
      await offboardUser(selectedUser._id).unwrap();
      dispatch(addToast({ type: 'success', message: `${selectedUser.name} has been offboarded.`, duration: 3000 }));
      dispatch(closeModal());
      setSelectedUser(null);
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to offboard manager.';
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  }, [selectedUser, offboardUser, dispatch]);

  const handleDelete = useCallback(async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser._id).unwrap();
      dispatch(addToast({ type: 'success', message: `${selectedUser.name} has been deleted.`, duration: 3000 }));
      dispatch(closeModal());
      setSelectedUser(null);
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to delete manager.';
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  }, [selectedUser, deleteUser, dispatch]);

  const handleOnboard = useCallback(async () => {
    if (!selectedUser) return;
    try {
      await onboardUser(selectedUser._id).unwrap();
      dispatch(addToast({ type: 'success', message: 'Manager re-onboarded successfully.', duration: 3000 }));
      dispatch(closeModal());
      setSelectedUser(null);
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to re-onboard manager.';
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  }, [selectedUser, onboardUser, dispatch]);

  const openOffboardDialog = useCallback((manager: UserData) => {
    setSelectedUser(manager);
    dispatch(openModal(MODAL_OFFBOARD));
  }, [dispatch]);

  const openDeleteDialog = useCallback((manager: UserData) => {
    setSelectedUser(manager);
    dispatch(openModal(MODAL_DELETE));
  }, [dispatch]);

  const openOnboardDialog = useCallback((manager: UserData) => {
    setSelectedUser(manager);
    dispatch(openModal(MODAL_ONBOARD));
  }, [dispatch]);

  // ── Access Guard ────────────────────────────────────
  // (placed after all hooks to satisfy rules-of-hooks)
  if (user?.role !== 'admin') {
    router.replace('/admin/dashboard');
    return null;
  }

  // ── Derived Data ────────────────────────────────────
  const managers = data?.data ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: LIMIT, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false };

  // ── Table Columns ───────────────────────────────────
  const columns: TableColumn<UserData>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
    },
    {
      key: 'empId',
      label: 'EMP-ID',
      sortable: true,
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
    },
    {
      key: 'domain',
      label: 'Domain',
      sortable: true,
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value) => {
        const status = value as UserData['status'];
        const variant = status === 'active' ? 'success' : status === 'offboarded' ? 'warning' : 'default';
        return (
          <Badge variant={variant}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (_value, row) => (
        <div className="flex items-center justify-end gap-xs">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/managers/${row._id}`);
            }}
          >
            View
          </Button>
          {row.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openOffboardDialog(row);
              }}
            >
              Off-board
            </Button>
          )}
          {row.status === 'offboarded' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openOnboardDialog(row);
              }}
            >
              <RefreshCw className="mr-xs h-3 w-3" />
              Re-Onboard
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-error hover:text-error"
            onClick={(e) => {
              e.stopPropagation();
              openDeleteDialog(row);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  // ── Loading State ───────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading managers..." />
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────
  return (
    <div className="flex flex-col gap-lg">
      {/* Header */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h1 text-text-primary">
          {pagination.total} {t('users.managers')}
        </h1>
        <Button
          variant="primary"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => router.push('/admin/managers/create')}
        >
          {t('users.addManager')}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center">
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Search managers..."
          className="flex-1"
        />
        <Dropdown
          items={STATUS_FILTER_ITEMS}
          value={statusFilter}
          onChange={handleStatusFilter}
          placeholder="Filter by status"
          className="w-full sm:w-[200px]"
        />
      </div>

      {/* Table */}
      <Table<UserData>
        columns={columns}
        data={managers}
        rowKey="_id"
        sortKey={sortKey}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage="No managers found."
        isLoading={isFetching}
      />

      {/* Pagination */}
      {pagination.totalPages > 0 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={setPage}
        />
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        modalId={MODAL_OFFBOARD}
        title="Off-board Manager"
        message={`Are you sure you want to off-board ${selectedUser?.name ?? 'this manager'}? They will lose access to the platform.`}
        confirmLabel="Off-board"
        variant="danger"
        isLoading={isOffboarding}
        onConfirm={handleOffboard}
      />

      <ConfirmDialog
        modalId={MODAL_DELETE}
        title="Delete Manager"
        message={`Are you sure you want to delete ${selectedUser?.name ?? 'this manager'}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />

      <ConfirmDialog
        modalId={MODAL_ONBOARD}
        title="Re-Onboard Manager"
        message={`Are you sure you want to re-onboard ${selectedUser?.name ?? 'this manager'}? They will regain access to the platform.`}
        confirmLabel="Re-Onboard"
        variant="primary"
        isLoading={isOnboarding}
        onConfirm={handleOnboard}
      />
    </div>
  );
}
