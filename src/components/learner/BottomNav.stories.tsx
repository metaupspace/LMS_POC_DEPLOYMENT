import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import BottomNavLearner from './BottomNav';

const meta: Meta<typeof BottomNavLearner> = {
  title: 'Learner/BottomNav',
  component: BottomNavLearner,
  parameters: {
    viewport: { defaultViewport: 'mobile' },
    layout: 'fullscreen',
    nextjs: { appDirectory: true, navigation: { pathname: '/learner/home' } },
  },
};

export default meta;
type Story = StoryObj<typeof BottomNavLearner>;

export const HomeActive: Story = {
  parameters: { nextjs: { navigation: { pathname: '/learner/home' } } },
};

export const SessionsActive: Story = {
  parameters: { nextjs: { navigation: { pathname: '/learner/sessions' } } },
};

export const LearningActive: Story = {
  parameters: { nextjs: { navigation: { pathname: '/learner/learning' } } },
};

export const ProfileActive: Story = {
  parameters: { nextjs: { navigation: { pathname: '/learner/profile' } } },
};
