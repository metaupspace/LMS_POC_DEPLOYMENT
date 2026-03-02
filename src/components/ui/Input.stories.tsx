import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Search, Mail } from 'lucide-react';
import Input from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = { args: { label: 'Email', placeholder: 'Enter email address' } };
export const WithValue: Story = { args: { label: 'Name', value: 'John Doe' } };
export const WithError: Story = { args: { label: 'Password', type: 'password', error: 'Password must be at least 8 characters' } };
export const Disabled: Story = { args: { label: 'EMP-ID', value: 'EMP-001', disabled: true } };
export const WithLeftIcon: Story = { args: { label: 'Search', placeholder: 'Search staff...', leftIcon: <Search className="h-4 w-4" /> } };
export const WithMailIcon: Story = { args: { label: 'Email', placeholder: 'you@example.com', leftIcon: <Mail className="h-4 w-4" /> } };
export const Password: Story = { args: { label: 'Password', isPassword: true, placeholder: 'Enter password' } };
export const DateInput: Story = { args: { label: 'Date', type: 'date' } };
export const TimeInput: Story = { args: { label: 'Time Slot', type: 'time' } };
export const NumberInput: Story = { args: { label: 'Duration (minutes)', type: 'number', placeholder: '60' } };
