'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, UserX, Trash2, RefreshCw } from 'lucide-react';
import {
  useGetUsersQuery,
  useDeleteUserMutation,
  useOffboardUserMutation,
  useOnboardUserMutation,
  useGetUserMetadataQuery,
} from '@/store/slices/api/userApi';
import type { UserData } from '@/store/slices/api/userApi';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { addToast, openModal, closeModal } from '@/store/slices/uiSlice';
import {
  Button,
  Table,
  Badge,
  SearchBar,
  Dropdown,
  Pagination,
  ConfirmDialog,
  LoadingSpinner,
} from '@/components/ui';
import type { TableColumn } from '@/components/ui';
import { useTranslation } from '@/i18n';
import { getErrorMessage } from '@/lib/utils/getErrorMessage';

// ─── Helpers ────────────────────────────────────────────

function getStatusVariant(status: string): 'success' | 'warning' | 'default' {
  switch (status) {
    case 'active':
      return 'success';
    case 'offboarded':
      return 'warning';
    default:
      return 'default';
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// ─── Filter Options ─────────────────────────────────────

const statusOptions = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Offboarded', value: 'offboarded' },
];

// ─── Component ──────────────────────────────────────────

export default function CoachesList() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const currentUser = useAppSelector((s) => s.auth.user);
  const isAdmin = currentUser?.role === 'admin';

  // Dynamic metadata for domain filter
  const { data: metadataResponse } = useGetUserMetadataQuery();
  const domainOptions = useMemo(() => {
    const domains = metadataResponse?.data?.domains ?? [];
    return [
      { label: 'All Domains', value: '' },
      ...domains.map((d) => ({ label: d, value: d })),
    ];
  }, [metadataResponse]);

  // Filters & pagination state
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Target user for confirm dialogs
  const [targetUser, setTargetUser] = useState<UserData | null>(null);

  // Queries & mutations
  const { data: response, isLoading } = useGetUsersQuery({
    role: 'coach',
    page,
    limit: 10,
    search: search || undefined,
    status: (status as 'active' | 'offboarded') || undefined,
    sortBy,
    sortOrder,
  });

  const [deleteUser, { isLoading: isDeleting }] = useDeleteUserMutation();
  const [offboardUser, { isLoading: isOffboarding }] = useOffboardUserMutation();
  const [onboardUser, { isLoading: isOnboarding }] = useOnboardUserMutation();

  const coaches = response?.data ?? [];
  const pagination = response?.pagination;
  const totalCount = pagination?.total ?? 0;

  // ── Handlers ──────────────────────────────────────────

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleDomainFilter = useCallback((value: string) => {
    setDomain(value);
    setPage(1);
  }, []);

  const handleStatusFilter = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
  }, []);

  const handleSort = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortBy(key);
    setSortOrder(order);
  }, []);

  const handleDelete = async () => {
    if (!targetUser) return;
    try {
      await deleteUser(targetUser._id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Coach deleted successfully', duration: 3000 }));
      setTargetUser(null);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: getErrorMessage(err), duration: 4000 }));
    }
  };

  const handleOffboard = async () => {
    if (!targetUser) return;
    try {
      await offboardUser(targetUser._id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Coach offboarded successfully', duration: 3000 }));
      setTargetUser(null);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: getErrorMessage(err), duration: 4000 }));
    }
  };

  const handleOnboard = async () => {
    if (!targetUser) return;
    try {
      await onboardUser(targetUser._id).unwrap();
      dispatch(closeModal());
      dispatch(addToast({ type: 'success', message: 'Coach re-onboarded successfully', duration: 3000 }));
      setTargetUser(null);
    } catch (err) {
      dispatch(addToast({ type: 'error', message: getErrorMessage(err), duration: 4000 }));
    }
  };

  // ── Table Columns ─────────────────────────────────────

  const columns: TableColumn<UserData>[] = useMemo(
    () => [
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
        key: 'domain',
        label: 'Domain',
        sortable: true,
        render: (value) => (value as string) || '-',
      },
      {
        key: 'location',
        label: 'Location',
        sortable: true,
        render: (value) => (value as string) || '-',
      },
      {
        key: 'status',
        label: 'Status',
        render: (value) => (
          <Badge variant={getStatusVariant(value as string)}>
            {capitalize(value as string)}
          </Badge>
        ),
      },
      {
        key: 'actions',
        label: 'Actions',
        align: 'right' as const,
        render: (_value, row) => (
          <div className="flex items-center justify-end gap-xs">
            <Button
              type="button"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/admin/coaches/${row._id}`);
              }}
              aria-label={`View ${row.name}`}
              size="sm"
            >
              <Eye className="mr-xs h-4 w-4" />
            </Button>
            {isAdmin && row.status === 'active' && (
              <Button
                type="button"
                variant='ghost'
                size='sm'
                onClick={(e) => {
                  e.stopPropagation();
                  setTargetUser(row);
                  dispatch(openModal('offboard-coach'));
                }}
                aria-label={`Off-board ${row.name}`}
              >
                <UserX className="mr-xs h-4 w-4" />
              </Button>
            )}
            {isAdmin && row.status === 'offboarded' && (
              <Button
                type="button"
                variant='ghost'
                size='sm'
                onClick={(e) => {
                  e.stopPropagation();
                  setTargetUser(row);
                  dispatch(openModal('onboard-coach'));
                }}
                aria-label={`Re-onboard ${row.name}`}
              >
                <RefreshCw className="mr-xs h-4 w-4" />
              </Button>
            )}
            {isAdmin && (
              <Button
                type="button"
                variant='ghost'
                size='sm'
                onClick={(e) => {
                  e.stopPropagation();
                  setTargetUser(row);
                  dispatch(openModal('delete-coach'));
                }}
                aria-label={`Delete ${row.name}`}
              >
                <Trash2 className="mr-xs h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [router, dispatch, isAdmin]
  );

  // ── Loading State ─────────────────────────────────────

  if (isLoading && coaches.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <LoadingSpinner variant="inline" text="Loading coaches..." />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────

  return (
    <div className="space-y-lg">
      {/* Header */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-h1 text-text-primary">{totalCount} {t('users.coaches')}</h1>
        {isAdmin && (
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => router.push('/admin/coaches/create')}
          >
            {t('users.addCoach')}
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-md sm:flex-row sm:items-center">
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Search coaches..."
          className="w-full sm:max-w-xs"
        />
        <Dropdown
          items={domainOptions}
          value={domain}
          onChange={handleDomainFilter}
          placeholder="All Domains"
          className="w-full sm:w-44"
        />
        <Dropdown
          items={statusOptions}
          value={status}
          onChange={handleStatusFilter}
          placeholder="All Status"
          className="w-full sm:w-40"
        />
      </div>

      {/* Table */}
      <Table<UserData>
        columns={columns}
        data={coaches}
        rowKey="_id"
        sortKey={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        emptyMessage="No coaches found"
        isLoading={isLoading}
      />

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
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
        modalId="offboard-coach"
        title="Off-board Coach"
        message={
          targetUser
            ? `Are you sure you want to off-board ${targetUser.name}? They will lose access to the platform.`
            : ''
        }
        confirmLabel="Off-board"
        variant="danger"
        isLoading={isOffboarding}
        onConfirm={handleOffboard}
        onCancel={() => setTargetUser(null)}
      />

      <ConfirmDialog
        modalId="delete-coach"
        title="Delete Coach"
        message={
          targetUser
            ? `Are you sure you want to delete ${targetUser.name}? This action cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setTargetUser(null)}
      />

      <ConfirmDialog
        modalId="onboard-coach"
        title="Re-Onboard Coach"
        message={
          targetUser
            ? `Are you sure you want to re-onboard ${targetUser.name}? They will regain access to the platform.`
            : ''
        }
        confirmLabel="Re-Onboard"
        variant="primary"
        isLoading={isOnboarding}
        onConfirm={handleOnboard}
        onCancel={() => setTargetUser(null)}
      />
    </div>
  );
}
