import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import HelpCenter from './HelpCenter';
import { ReduxDecorator } from '../../../.storybook/decorators';

const meta: Meta<typeof HelpCenter> = {
  title: 'Shared/HelpCenter',
  component: HelpCenter,
  decorators: [ReduxDecorator],
  parameters: {
    viewport: { defaultViewport: 'mobile' },
    nextjs: { appDirectory: true, navigation: { pathname: '/learner/profile' } },
  },
};

export default meta;
type Story = StoryObj<typeof HelpCenter>;

export const Default: Story = {};
