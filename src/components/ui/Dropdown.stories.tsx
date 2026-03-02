import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Dropdown from './Dropdown';

const meta: Meta<typeof Dropdown> = {
  title: 'UI/Dropdown',
  component: Dropdown,
};

export default meta;
type Story = StoryObj<typeof Dropdown>;

export const Default: Story = {
  args: {
    label: 'Status',
    items: [
      { label: 'All', value: '' },
      { label: 'Active', value: 'active' },
      { label: 'Offboarded', value: 'offboarded' },
    ],
    placeholder: 'Select status',
  },
};

export const WithValue: Story = {
  args: {
    label: 'Role',
    items: [
      { label: 'Coach', value: 'coach' },
      { label: 'Staff', value: 'staff' },
      { label: 'Manager', value: 'manager' },
    ],
    value: 'coach',
    placeholder: 'Select role',
  },
};

export const SessionModes: Story = {
  args: {
    label: 'Session Mode',
    items: [
      { label: 'Offline (In-person)', value: 'offline' },
      { label: 'Online (Virtual)', value: 'online' },
    ],
    value: 'offline',
  },
};

export const StatusFilter: Story = {
  args: {
    items: [
      { label: 'All', value: '' },
      { label: 'Upcoming', value: 'upcoming' },
      { label: 'Ongoing', value: 'ongoing' },
      { label: 'Completed', value: 'completed' },
      { label: 'Cancelled', value: 'cancelled' },
    ],
    placeholder: 'Filter by status',
  },
};
