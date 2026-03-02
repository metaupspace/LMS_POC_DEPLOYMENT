import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Badge from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  argTypes: {
    variant: { control: 'select', options: ['success', 'warning', 'error', 'info', 'default'] },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Success: Story = { args: { variant: 'success', children: 'Active' } };
export const Warning: Story = { args: { variant: 'warning', children: 'Upcoming' } };
export const Error: Story = { args: { variant: 'error', children: 'Cancelled' } };
export const Info: Story = { args: { variant: 'info', children: 'Online' } };
export const Default: Story = { args: { variant: 'default', children: 'Offboarded' } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-sm">
      <Badge variant="success">Active</Badge>
      <Badge variant="warning">Upcoming</Badge>
      <Badge variant="error">Cancelled</Badge>
      <Badge variant="info">Online</Badge>
      <Badge variant="default">Offboarded</Badge>
    </div>
  ),
};

export const SessionStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-sm">
      <Badge variant="warning">Upcoming</Badge>
      <Badge variant="info">Ongoing</Badge>
      <Badge variant="success">Completed</Badge>
      <Badge variant="error">Cancelled</Badge>
    </div>
  ),
};

export const BadgeTiers: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-sm">
      <Badge variant="default">Rookie</Badge>
      <Badge variant="info">Silver</Badge>
      <Badge variant="warning">Gold</Badge>
      <Badge variant="success">Premium</Badge>
    </div>
  ),
};
