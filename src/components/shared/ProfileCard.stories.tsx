import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import ProfileCard from './ProfileCard';
import { ReduxDecorator } from '../../../.storybook/decorators';

const meta: Meta<typeof ProfileCard> = {
  title: 'Shared/ProfileCard',
  component: ProfileCard,
  decorators: [ReduxDecorator],
  parameters: {
    nextjs: { appDirectory: true, navigation: { pathname: '/admin/dashboard' } },
  },
};

export default meta;
type Story = StoryObj<typeof ProfileCard>;

export const Default: Story = {};
