import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { BookOpen, Star, CalendarDays } from 'lucide-react';
import Card from './Card';
import Badge from './Badge';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  argTypes: {
    hoverable: { control: 'boolean' },
    noPadding: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: { children: <p className="text-body-md text-text-secondary">This is a basic card with default padding and styling.</p> },
};

export const WithHeader: Story = {
  args: {
    header: <h3 className="text-h3 text-text-primary">Card Title</h3>,
    children: <p className="text-body-md text-text-secondary">Card content goes here.</p>,
  },
};

export const Hoverable: Story = {
  args: {
    hoverable: true,
    children: <p className="text-body-md text-text-secondary">Hover over me for an effect.</p>,
  },
};

export const StatCard: Story = {
  render: () => (
    <div className="w-[200px]">
      <Card>
        <div className="flex items-center gap-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light">
            <BookOpen className="h-5 w-5 text-primary-main" />
          </div>
          <div>
            <p className="text-h1 font-semibold text-text-primary">12</p>
            <p className="text-caption text-text-secondary">Active Courses</p>
          </div>
        </div>
      </Card>
    </div>
  ),
};

export const SessionCard: Story = {
  render: () => (
    <div className="w-[320px]">
      <Card noPadding hoverable className="cursor-pointer overflow-hidden">
        <div className="flex h-[140px] items-center justify-center bg-surface-background">
          <CalendarDays className="h-8 w-8 text-text-disabled" />
        </div>
        <div className="p-md">
          <h3 className="text-body-lg font-medium text-text-primary">Safety Training Workshop</h3>
          <p className="mt-sm text-caption text-text-secondary">Mumbai | 2:00 PM</p>
          <div className="mt-md flex items-center justify-between">
            <span className="text-caption text-text-secondary">Instructor assigned</span>
            <Badge variant="warning">Upcoming</Badge>
          </div>
        </div>
      </Card>
    </div>
  ),
};

export const GamificationCard: Story = {
  render: () => (
    <div className="w-[200px]">
      <Card>
        <div className="flex items-center gap-md">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50">
            <Star className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <p className="text-h1 font-semibold text-text-primary">1,250</p>
            <p className="text-caption text-text-secondary">Total Points</p>
          </div>
        </div>
      </Card>
    </div>
  ),
};
