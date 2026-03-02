import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import Button from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'danger', 'ghost'] },
    size: { control: 'select', options: ['sm', 'md', 'lg'] },
    isLoading: { control: 'boolean' },
    isBlock: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = { args: { variant: 'primary', children: 'Create Course' } };
export const Secondary: Story = { args: { variant: 'secondary', children: 'Cancel' } };
export const Danger: Story = { args: { variant: 'danger', children: 'Delete User' } };
export const Ghost: Story = { args: { variant: 'ghost', children: 'View All' } };
export const Loading: Story = { args: { variant: 'primary', isLoading: true, children: 'Saving...' } };
export const Disabled: Story = { args: { variant: 'primary', disabled: true, children: 'Disabled' } };
export const WithLeftIcon: Story = { args: { variant: 'primary', leftIcon: <Plus className="h-4 w-4" />, children: 'Add Staff' } };
export const WithRightIcon: Story = { args: { variant: 'ghost', rightIcon: <ArrowRight className="h-4 w-4" />, children: 'View All' } };
export const DangerWithIcon: Story = { args: { variant: 'danger', leftIcon: <Trash2 className="h-4 w-4" />, children: 'Delete' } };
export const Block: Story = { args: { variant: 'primary', isBlock: true, children: 'Login' } };

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-md">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-md">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
};
