'use client';

import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

interface PDFViewerProps {
  url: string;
}

export default function PDFViewer({ url }: PDFViewerProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!url) {
    return (
      <div className="flex items-center justify-center h-[80vh] bg-white rounded-md">
        <p className="text-gray-500">No PDF URL provided</p>
      </div>
    );
  }

  // Always proxy Cloudinary URLs
  const proxyUrl = url.includes('cloudinary.com')
    ? `/api/proxy-pdf?url=${encodeURIComponent(url)}`
    : url;

  return (
    <div className="relative h-[80vh] bg-white rounded-md overflow-hidden">
      {/* Loading spinner — shown until iframe loads */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <Loader2 size={32} className="animate-spin text-primary-main mx-auto mb-2" />
            <p className="text-sm text-gray-500">Loading PDF...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
          <div className="text-center">
            <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
            <p className="text-red-500 text-sm mb-3">Could not load PDF preview</p>
            <div className="flex flex-col gap-2">
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="px-4 py-2 bg-primary-main text-white rounded-md text-sm hover:bg-primary-hover">
                Open PDF in new tab
              </a>
              <a href={url} download
                className="px-4 py-2 border border-gray-200 text-gray-600 rounded-md text-sm hover:bg-gray-50">
                Download PDF
              </a>
            </div>
          </div>
        </div>
      )}

      {/* PDF iframe — browser's built-in viewer */}
      <iframe
        src={proxyUrl}
        className="w-full h-full border-0"
        title="PDF Viewer"
        onLoad={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
      />
    </div>
  );
}
