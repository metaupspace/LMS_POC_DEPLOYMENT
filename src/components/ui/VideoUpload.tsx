'use client';

import { useState, useRef } from 'react';
import { Upload, X, Film, Loader2, Play } from 'lucide-react';

interface VideoUploadProps {
  value?: string;
  onChange: (_url: string) => void;
  onDurationDetected?: (_seconds: number) => void;
}

const ALLOWED_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
];
const MAX_SIZE = 100 * 1024 * 1024; // 100MB

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/i.test(url);
}

function getYouTubeThumbnail(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : null;
}

export default function VideoUpload({ value, onChange, onDurationDetected }: VideoUploadProps) {
  const [mode, setMode] = useState<'choose' | 'upload' | 'youtube'>('choose');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [youtubeInput, setYoutubeInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Invalid file type. Use MP4, WebM, OGG, MOV, or AVI.');
      return;
    }
    if (file.size > MAX_SIZE) {
      setError('File too large. Maximum 100MB.');
      return;
    }

    setError('');
    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'videos');
      formData.append('resource_type', 'video');

      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise<Record<string, unknown>>((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error('Upload failed'));
          }
        };
        xhr.onerror = () => reject(new Error('Upload failed'));
        xhr.open('POST', '/api/upload');
        xhr.send(formData);
      });

      const result = await uploadPromise;
      const data = result?.data as Record<string, unknown> | undefined;
      const url = (data?.url as string) || (result?.url as string);

      if (url) {
        onChange(url);
        if (onDurationDetected && data?.duration) {
          onDurationDetected(Math.round(data.duration as number));
        }
      } else {
        setError('Upload succeeded but no URL returned');
      }
    } catch {
      setError('Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const handleYoutubeSubmit = () => {
    const url = youtubeInput.trim();
    if (!url) {
      setError('Please enter a YouTube URL');
      return;
    }
    if (!isYouTubeUrl(url)) {
      setError(
        'Invalid YouTube URL. Use format: https://www.youtube.com/watch?v=... or https://youtu.be/...'
      );
      return;
    }
    setError('');
    onChange(url);
    setYoutubeInput('');
  };

  const handleRemove = () => {
    onChange('');
    setMode('choose');
    setYoutubeInput('');
    setError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Preview (value exists) ──
  if (value) {
    const isYT = isYouTubeUrl(value);
    const ytThumb = isYT ? getYouTubeThumbnail(value) : null;

    return (
      <div className="relative rounded-md overflow-hidden border border-border-light">
        {isYT ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={ytThumb || ''}
              alt="YouTube thumbnail"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                <Play size={20} className="text-white ml-0.5" fill="white" />
              </div>
            </div>
            <span className="absolute bottom-2 left-2 bg-black/70 text-white text-caption px-2 py-1 rounded">
              YouTube Video
            </span>
          </div>
        ) : (
          <video
            src={value}
            controls
            className="w-full max-h-48 bg-black"
            preload="metadata"
          />
        )}
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-2 right-2 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  // ── Uploading ──
  if (uploading) {
    return (
      <div className="border-2 border-dashed border-primary-main rounded-md p-6 text-center bg-primary-light/30">
        <Loader2
          size={32}
          className="mx-auto mb-2 text-primary-main animate-spin"
        />
        <p className="text-body-md font-medium">Uploading... {progress}%</p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-primary-main h-2 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // ── Mode selection / input ──
  return (
    <div>
      {mode === 'choose' && (
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode('upload')}
            className="border-2 border-dashed border-border-light hover:border-primary-main rounded-md p-4 text-center cursor-pointer transition-colors hover:bg-primary-light/10"
          >
            <Upload size={28} className="mx-auto mb-2 text-text-secondary" />
            <p className="text-body-md font-medium">Upload Video</p>
            <p className="text-caption text-text-secondary mt-1">
              MP4, WebM, MOV — max 100MB
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode('youtube')}
            className="border-2 border-dashed border-border-light hover:border-red-500 rounded-md p-4 text-center cursor-pointer transition-colors hover:bg-red-50"
          >
            <svg
              className="mx-auto mb-2"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19.1c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.43z"
                fill="#FF0000"
              />
              <path
                d="m9.75 15.02 5.75-3.27-5.75-3.27v6.54z"
                fill="white"
              />
            </svg>
            <p className="text-body-md font-medium">YouTube URL</p>
            <p className="text-caption text-text-secondary mt-1">
              Paste a YouTube link
            </p>
          </button>
        </div>
      )}

      {mode === 'upload' && (
        <div>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) handleFileUpload(f);
            }}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border-light hover:border-primary-main rounded-md p-6 text-center cursor-pointer transition-colors hover:bg-primary-light/10"
          >
            <Film size={32} className="mx-auto mb-2 text-text-secondary" />
            <p className="text-body-md font-medium">
              Drag & drop or click to browse
            </p>
            <p className="text-caption text-text-secondary mt-1">
              MP4, WebM, MOV — max 100MB
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMode('choose')}
            className="text-caption text-primary-main mt-2 hover:underline"
          >
            &larr; Back to options
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/ogg,video/quicktime,video/x-msvideo"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileUpload(f);
            }}
            className="hidden"
          />
        </div>
      )}

      {mode === 'youtube' && (
        <div>
          <div className="flex gap-2">
            <input
              type="url"
              value={youtubeInput}
              onChange={(e) => {
                setYoutubeInput(e.target.value);
                setError('');
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 border border-border-light rounded-sm px-3 py-2 text-body-md focus:border-primary-main focus:outline-none focus:ring-1 focus:ring-primary-main"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleYoutubeSubmit();
                }
              }}
            />
            <button
              type="button"
              onClick={handleYoutubeSubmit}
              className="px-4 py-2 bg-primary-main text-white rounded-sm text-button hover:bg-primary-hover"
            >
              Add
            </button>
          </div>
          <button
            type="button"
            onClick={() => setMode('choose')}
            className="text-caption text-primary-main mt-2 hover:underline"
          >
            &larr; Back to options
          </button>
        </div>
      )}

      {error && <p className="text-error text-caption mt-1">{error}</p>}
    </div>
  );
}
