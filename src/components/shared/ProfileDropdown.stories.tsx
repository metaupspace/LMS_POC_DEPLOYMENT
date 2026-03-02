import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ProfileDropdown from './ProfileDropdown';
import { ReduxDecorator } from '../../../.storybook/decorators';

const meta: Meta<typeof ProfileDropdown> = {
  title: 'Shared/ProfileDropdown',
  component: ProfileDropdown,
  decorators: [ReduxDecorator],
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/admin/dashboard' } },
  },
};

export default meta;
type Story = StoryObj<typeof ProfileDropdown>;

export const Default: Story = {};
