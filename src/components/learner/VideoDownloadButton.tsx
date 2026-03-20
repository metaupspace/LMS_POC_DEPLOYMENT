'use client';

import { useState } from 'react';
import { Download, Loader2, CheckCircle, WifiOff } from 'lucide-react';

interface VideoDownloadButtonProps {
  videoUrl: string;
  title: string;
  className?: string;
}

function getDownloadUrl(url: string): string {
  if (!url) return '';
  // Cloudinary: insert fl_attachment to force browser download
  if (url.includes('cloudinary.com')) {
    return url.replace('/upload/', '/upload/fl_attachment/');
  }
  return url;
}

function getFileName(title: string, url: string): string {
  const ext = url.split('?')[0]?.split('.').pop() || 'mp4';
  const clean = title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_').substring(0, 50);
  return `${clean}.${ext}`;
}

export default function VideoDownloadButton({ videoUrl, title, className = '' }: VideoDownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState('');

  const handleDownload = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      setError('');

      const downloadUrl = getDownloadUrl(videoUrl);
      const fileName = getFileName(title, videoUrl);

      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('[Download] Error:', err);
      setError('Download failed. Try again.');
      setTimeout(() => setError(''), 4000);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDirectDownload = () => {
    const downloadUrl = getDownloadUrl(videoUrl);
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isDownloading}
        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
          downloaded
            ? 'bg-green-50 text-green-600 border border-green-200'
            : error
            ? 'bg-red-50 text-red-500 border border-red-200'
            : isDownloading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 hover:border-gray-300'
        }`}
      >
        {downloaded ? (
          <>
            <CheckCircle size={16} />
            Downloaded
          </>
        ) : isDownloading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Downloading...
          </>
        ) : error ? (
          <>
            <WifiOff size={16} />
            {error}
          </>
        ) : (
          <>
            <Download size={16} />
            Download Video
          </>
        )}
      </button>

      {!isDownloading && !downloaded && (
        <button
          type="button"
          onClick={handleDirectDownload}
          className="text-xs text-gray-400 hover:text-primary-main hover:underline"
          title="Open in new tab (alternative download)"
        >
          Direct link
        </button>
      )}
    </div>
  );
}
