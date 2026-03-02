import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Pagination from './Pagination';

const meta: Meta<typeof Pagination> = {
  title: 'UI/Pagination',
  component: Pagination,
  argTypes: {
    page: { control: 'number' },
    totalPages: { control: 'number' },
    total: { control: 'number' },
    limit: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof Pagination>;

export const FirstPage: Story = { args: { page: 1, totalPages: 10, total: 95, limit: 10, onPageChange: () => {} } };
export const MiddlePage: Story = { args: { page: 5, totalPages: 10, total: 95, limit: 10, onPageChange: () => {} } };
export const LastPage: Story = { args: { page: 10, totalPages: 10, total: 95, limit: 10, onPageChange: () => {} } };
export const SinglePage: Story = { args: { page: 1, totalPages: 1, total: 5, limit: 10, onPageChange: () => {} } };
export const FewPages: Story = { args: { page: 2, totalPages: 3, total: 25, limit: 10, onPageChange: () => {} } };
