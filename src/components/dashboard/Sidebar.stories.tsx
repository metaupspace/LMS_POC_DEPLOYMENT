import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Sidebar from './Sidebar';
import { ReduxDecorator } from '../../../.storybook/decorators';

const meta: Meta<typeof Sidebar> = {
  title: 'Dashboard/Sidebar',
  component: Sidebar,
  decorators: [ReduxDecorator],
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true, navigation: { pathname: '/admin/dashboard' } },
  },
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

export const DashboardActive: Story = {
  parameters: { nextjs: { navigation: { pathname: '/admin/dashboard' } } },
};

export const CoursesActive: Story = {
  parameters: { nextjs: { navigation: { pathname: '/admin/courses' } } },
};

export const SessionsActive: Story = {
  parameters: { nextjs: { navigation: { pathname: '/admin/sessions' } } },
};

export const StaffActive: Story = {
  parameters: { nextjs: { navigation: { pathname: '/admin/staff' } } },
};
