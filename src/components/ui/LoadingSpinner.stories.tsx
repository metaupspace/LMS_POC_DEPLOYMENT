import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import LoadingSpinner from './LoadingSpinner';

const meta: Meta<typeof LoadingSpinner> = {
  title: 'UI/LoadingSpinner',
  component: LoadingSpinner,
  argTypes: {
    variant: { control: 'select', options: ['fullscreen', 'inline', 'button'] },
  },
};

export default meta;
type Story = StoryObj<typeof LoadingSpinner>;

export const Inline: Story = { args: { variant: 'inline' } };
export const InlineWithText: Story = { args: { variant: 'inline', text: 'Loading courses...' } };
export const ButtonSize: Story = { args: { variant: 'button' } };
export const Fullscreen: Story = {
  args: { variant: 'fullscreen', text: 'Loading dashboard...' },
  parameters: { layout: 'fullscreen' },
};
