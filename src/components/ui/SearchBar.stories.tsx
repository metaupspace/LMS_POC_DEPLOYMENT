import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SearchBar from './SearchBar';

const meta: Meta<typeof SearchBar> = {
  title: 'UI/SearchBar',
  component: SearchBar,
};

export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Default: Story = { args: { placeholder: 'Search...' } };
export const WithPlaceholder: Story = { args: { placeholder: 'Search by name, EMP-ID, or domain...' } };
export const WithValue: Story = { args: { value: 'John', placeholder: 'Search staff...' } };
export const CustomWidth: Story = { args: { placeholder: 'Search sessions...', className: 'w-[280px]' } };
