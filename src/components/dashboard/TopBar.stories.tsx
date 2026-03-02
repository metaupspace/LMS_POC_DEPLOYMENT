import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import TopBar from './TopBar';
import { ReduxDecorator } from '../../../.storybook/decorators';

const meta: Meta<typeof TopBar> = {
  title: 'Dashboard/TopBar',
  component: TopBar,
  decorators: [ReduxDecorator],
  parameters: {
    layout: 'fullscreen',
    nextjs: { appDirectory: true, navigation: { pathname: '/admin/dashboard' } },
  },
};

export default meta;
type Story = StoryObj<typeof TopBar>;

export const Default: Story = {};
