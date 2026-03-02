import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import Calendar from './Calendar';

const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');

const meta: Meta<typeof Calendar> = {
  title: 'UI/Calendar',
  component: Calendar,
};

export default meta;
type Story = StoryObj<typeof Calendar>;

export const Default: Story = {
  args: { events: [] },
};

export const WithSessions: Story = {
  args: {
    events: [
      { date: `${yyyy}-${mm}-05`, title: 'Safety Training', status: 'completed' as const },
      { date: `${yyyy}-${mm}-10`, title: 'Sales Workshop', status: 'completed' as const },
      { date: `${yyyy}-${mm}-15`, title: 'Team Building', status: 'upcoming' as const },
      { date: `${yyyy}-${mm}-20`, title: 'Leadership Session', status: 'upcoming' as const },
      { date: `${yyyy}-${mm}-25`, title: 'Cancelled Workshop', status: 'cancelled' as const },
    ],
  },
};

export const BusyMonth: Story = {
  args: {
    events: Array.from({ length: 15 }, (_, i) => ({
      date: `${yyyy}-${mm}-${String(i + 1).padStart(2, '0')}`,
      title: `Session ${i + 1}`,
      status: (i < 5 ? 'completed' : i < 12 ? 'upcoming' : 'cancelled') as 'completed' | 'upcoming' | 'cancelled',
    })),
  },
};
