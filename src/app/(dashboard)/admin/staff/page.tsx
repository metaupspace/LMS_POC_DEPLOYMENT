'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, UserMinus, Trash2, RefreshCw } from 'lucide-react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToast, openModal, closeModal } from '@/store/slices/uiSlice';
import {
  useGetUsersQuery,
  useDeleteUserMutation,
  useOffboardUserMutation,
  useOnboardUserMutation,
  type UserData,
} from '@/store/slices/api/userApi';
import {
  Button,
  Card,
  Table,
  Badge,
  SearchBar,
  Dropdown,
  Pagination,
  LoadingSpinner,
  ConfirmDialog,
} from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useTranslation } from '@/i18n';

// ─── Status Badge Variant ─────────────────────────────────

type StatusVariant = 'success' | 'warning' | 'error' | 'default';

const statusVariantMap: Record<string, StatusVariant> = {
  active: 'success',
  offboarded: 'warning',
};

// ─── Filter Options ───────────────────────────────────────

const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Offboarded', value: 'offboarded' },
];

// ─── Staff List Page ──────────────────────────────────────

export default function StaffListPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const currentUser = useAppSelector((s) => s.auth.user);
  const isAdmin = currentUser?.role === 'admin';

  // Filter state
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Selected user for actions
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

  // RTK Query
  const { data: usersResponse, isLoading, isError } = useGetUsersQuery({
    role: 'staff',
    page,
    limit,
    search: search || undefined,
    status: status ? (status as UserData['status']) : undefined,
    sortBy,
    sortOrder,
  });

  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [offboardUser, { isLoading: isOffboarding }] = useOffboardUserMutation();
  const [onboardUser, { isLoading: isOnboarding }] = useOnboardUserMutation();

  const staffMembers = usersResponse?.data ?? [];
  const pagination = usersResponse?.pagination;

  // ─── Unique filter values from data ───────────────────

  const domainOptions = [
    { label: 'All Domains', value: '' },
    ...Array.from(new Set(staffMembers.map((u) => u.domain).filter(Boolean))).map((d) => ({
      label: d,
      value: d,
    })),
  ];

  const locationOptions = [
    { label: 'All Locations', value: '' },
    ...Array.from(new Set(staffMembers.map((u) => u.location).filter(Boolean))).map((l) => ({
      label: l,
      value: l,
    })),
  ];

  // ─── Filter data client-side for domain/location ──────

  const filteredStaff = staffMembers.filter((user) => {
    if (domain && user.domain !== domain) return false;
    if (location && user.location !== location) return false;
    return true;
  });

  // ─── Handlers ──────────────────────────────────────────

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleOffboard = async () => {
    if (!selectedUser) return;
    try {
      await offboardUser(selectedUser._id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: `${selectedUser.name} offboarded successfully.`, duration: 3000 }));
      setSelectedUser(null);
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to offboard staff member.';
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  const handleDelete = async () => {
    if (!selectedUser) return;
    try {
      await deleteUser(selectedUser._id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: `${selectedUser.name} deleted successfully.`, duration: 3000 }));
      setSelectedUser(null);
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to delete staff member.';
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  const handleOnboard = async () => {
    if (!selectedUser) return;
    try {
      await onboardUser(selectedUser._id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: `${selectedUser.name} re-onboarded successfully.`, duration: 3000 }));
      setSelectedUser(null);
    } catch (err) {
      const message = (err as { data?: { message?: string } })?.data?.message ?? 'Failed to re-onboard staff member.';
      dispatch(addToast({ type: 'error', message, duration: 3000 }));
    }
  };

  // ─── Table Columns ────────────────────────────────────

  const columns: TableColumn<UserData>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_value: unknown, row: UserData) => (
        <div className="flex items-center gap-sm">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-caption font-semibold text-primary-main">
            {row.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'empId',
      label: 'EMP-ID',
      sortable: true,
    },
    {
      key: 'domain',
      label: 'Domain',
      sortable: true,
      render: (value: unknown) => (value as string) || '-',
    },
    {
      key: 'location',
      label: 'Location',
      sortable: true,
      render: (value: unknown) => (value as string) || '-',
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: unknown) => {
        const s = value as string;
        return (
          <Badge variant={statusVariantMap[s] ?? 'default'}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Badge>
        );
      },
    },
    {
      key: '_id',
      label: 'Actions',
      align: 'right',
      render: (_value: unknown, row: UserData) => (
        <div className="flex items-center justify-end gap-xs">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/admin/staff/${row._id}`);
            }}
            className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-surface-background hover:text-primary-main"
            aria-label={`View ${row.name}`}
          >
            <Eye className="h-4 w-4" />
          </button>
          {isAdmin && row.status === 'active' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(row);
                dispatch(openModal('offboard-staff'));
              }}
              className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-surface-background hover:text-warning"
              aria-label={`Off-board ${row.name}`}
            >
              <UserMinus className="h-4 w-4" />
            </button>
          )}
          {isAdmin && row.status === 'offboarded' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(row);
                dispatch(openModal('onboard-staff'));
              }}
              className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-surface-background hover:text-success"
              aria-label={`Re-onboard ${row.name}`}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(row);
                dispatch(openModal('delete-staff'));
              }}
              className="rounded-sm p-xs text-text-secondary transition-colors hover:bg-surface-background hover:text-error"
              aria-label={`Delete ${row.name}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // ─── Loading / Error ──────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading staff members..." />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-md">
        <p className="text-body-lg text-text-secondary">Failed to load staff data.</p>
        <Button variant="primary" size="md" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-lg">
      {/* Header */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-h1 text-text-primary">
            {pagination?.total ?? filteredStaff.length} {t('users.staff')}
          </h1>
          <p className="mt-xs text-body-md text-text-secondary">
            Manage staff accounts and learning assignments
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => router.push('/admin/staff/create')}
          >
            {t('users.addStaff')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col gap-md sm:flex-row sm:items-end">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Search by name or employee ID..."
            className="flex-1"
          />
          <Dropdown
            items={domainOptions}
            value={domain}
            onChange={(val) => {
              setDomain(val);
              setPage(1);
            }}
            placeholder="All Domains"
            className="w-full sm:w-[180px]"
          />
          <Dropdown
            items={locationOptions}
            value={location}
            onChange={(val) => {
              setLocation(val);
              setPage(1);
            }}
            placeholder="All Locations"
            className="w-full sm:w-[180px]"
          />
          <Dropdown
            items={statusOptions}
            value={status}
            onChange={(val) => {
              setStatus(val);
              setPage(1);
            }}
            placeholder="All Status"
            className="w-full sm:w-[160px]"
          />
        </div>
      </Card>

      {/* Table */}
      <Table<UserData>
        columns={columns}
        data={filteredStaff}
        rowKey="_id"
        sortKey={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onRowClick={(row) => router.push(`/admin/staff/${row._id}`)}
        emptyMessage="No staff members found"
      />

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(newLimit) => {
            setLimit(newLimit);
            setPage(1);
          }}
        />
      )}

      {/* Confirm Dialogs */}
      <ConfirmDialog
        modalId="offboard-staff"
        title="Off-board Staff Member"
        message={`Are you sure you want to off-board ${selectedUser?.name ?? 'this user'}? They will lose access to the platform.`}
        confirmLabel="Off-board"
        variant="danger"
        isLoading={isOffboarding}
        onConfirm={handleOffboard}
        onCancel={() => setSelectedUser(null)}
      />

      <ConfirmDialog
        modalId="delete-staff"
        title="Delete Staff Member"
        message={`Are you sure you want to permanently delete ${selectedUser?.name ?? 'this user'}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setSelectedUser(null)}
      />

      <ConfirmDialog
        modalId="onboard-staff"
        title="Re-Onboard Staff Member"
        message={`Are you sure you want to re-onboard ${selectedUser?.name ?? 'this user'}? They will regain access to the platform.`}
        confirmLabel="Re-Onboard"
        variant="primary"
        isLoading={isOnboarding}
        onConfirm={handleOnboard}
        onCancel={() => setSelectedUser(null)}
      />
    </div>
  );
}
