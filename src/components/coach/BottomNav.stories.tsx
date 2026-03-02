import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import BottomNavCoach from './BottomNav';

const meta: Meta<typeof BottomNavCoach> = {
  title: 'Coach/BottomNav',
  component: BottomNavCoach,
  parameters: {
    viewport: { defaultViewport: 'mobile' },
    layout: 'fullscreen',
    nextjs: { appDirectory: true, navigation: { pathname: '/coach/home' } },
  },
};

export default meta;
type Story = StoryObj<typeof BottomNavCoach>;

export const HomeActive: Story = {
  parameters: { nextjs: { navigation: { pathname: '/coach/home' } } },
};

export const CoursesActive: Story = {
  parameters: { nextjs: { navigation: { pathname: '/coach/courses' } } },
};

export const ProfileActive: Story = {
  parameters: { nextjs: { navigation: { pathname: '/coach/profile' } } },
};
