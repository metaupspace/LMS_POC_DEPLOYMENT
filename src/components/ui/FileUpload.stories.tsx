import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import FileUpload from './FileUpload';

const meta: Meta<typeof FileUpload> = {
  title: 'UI/FileUpload',
  component: FileUpload,
};

export default meta;
type Story = StoryObj<typeof FileUpload>;

export const Default: Story = {
  args: { accept: 'image/*', maxSizeMB: 2, onFileSelect: () => {} },
};

export const WithPreview: Story = {
  args: {
    accept: 'image/*',
    previewUrl: 'https://via.placeholder.com/400x200',
    fileName: 'session-thumbnail.jpg',
    onFileSelect: () => {},
    onRemove: () => {},
  },
};

export const Uploading: Story = {
  args: {
    accept: 'image/*',
    progress: 60,
    fileName: 'uploading-file.png',
    onFileSelect: () => {},
  },
};

export const WithError: Story = {
  args: {
    accept: 'image/*',
    error: 'File size exceeds 2MB limit',
    onFileSelect: () => {},
  },
};
