import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Table from './Table';
import Badge from './Badge';

interface StaffRow {
  _id: string;
  name: string;
  empId: string;
  domain: string;
  location: string;
  status: string;
}

const mockStaff: StaffRow[] = [
  { _id: '1', name: 'Rahul Sharma', empId: 'EMP-001', domain: 'Plumbing', location: 'Mumbai', status: 'active' },
  { _id: '2', name: 'Priya Patel', empId: 'EMP-002', domain: 'Electrical', location: 'Delhi', status: 'active' },
  { _id: '3', name: 'Amit Singh', empId: 'EMP-003', domain: 'Sales', location: 'Bangalore', status: 'offboarded' },
  { _id: '4', name: 'Sneha Desai', empId: 'EMP-004', domain: 'Plumbing', location: 'Mumbai', status: 'active' },
  { _id: '5', name: 'Vikram Joshi', empId: 'EMP-005', domain: 'Electrical', location: 'Pune', status: 'active' },
];

const staffColumns = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'empId', label: 'EMP-ID', sortable: true },
  { key: 'domain', label: 'Domain' },
  { key: 'location', label: 'Location' },
  {
    key: 'status',
    label: 'Status',
    render: (value: unknown) => {
      const s = value as string;
      return <Badge variant={s === 'active' ? 'success' : 'warning'}>{s === 'active' ? 'Active' : 'Offboarded'}</Badge>;
    },
  },
];

const meta: Meta<typeof Table<StaffRow>> = {
  title: 'UI/Table',
  component: Table,
};

export default meta;
type Story = StoryObj<typeof Table<StaffRow>>;

export const StaffList: Story = {
  args: {
    columns: staffColumns,
    data: mockStaff,
    rowKey: '_id',
    emptyMessage: 'No staff found',
  },
};

export const Empty: Story = {
  args: {
    columns: staffColumns,
    data: [],
    rowKey: '_id',
    emptyMessage: 'No staff found',
  },
};

export const Loading: Story = {
  args: {
    columns: staffColumns,
    data: [],
    rowKey: '_id',
    isLoading: true,
  },
};

export const Clickable: Story = {
  args: {
    columns: staffColumns,
    data: mockStaff,
    rowKey: '_id',
    onRowClick: (row: StaffRow) => alert(`Clicked: ${row.name}`),
  },
};
