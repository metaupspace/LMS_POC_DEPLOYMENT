import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import NotificationBell from './NotificationBell';
import { ReduxDecorator } from '../../../.storybook/decorators';

const meta: Meta<typeof NotificationBell> = {
  title: 'Shared/NotificationBell',
  component: NotificationBell,
  decorators: [ReduxDecorator],
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/admin/dashboard' } },
  },
};

export default meta;
type Story = StoryObj<typeof NotificationBell>;

export const Default: Story = {
  args: { iconClassName: 'text-text-primary' },
};

export const WhiteIcon: Story = {
  args: { iconClassName: 'text-white' },
  decorators: [
    (Story) => (
      <div className="bg-primary-main p-md rounded-md">
        <Story />
      </div>
    ),
  ],
};
