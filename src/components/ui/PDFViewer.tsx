'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, AlertCircle } from 'lucide-react';

interface PDFViewerProps {
  url: string;
}

export default function PDFViewer({ url }: PDFViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  const renderingRef = useRef(false);

  useEffect(() => {
    if (!url) {
      setError('No PDF URL provided');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError('');
        setDebugInfo('Loading pdf.js library...');

        // Step 1: Fetch PDF as ArrayBuffer through proxy
        const proxyUrl = url.includes('cloudinary.com')
          ? `/api/proxy-pdf?url=${encodeURIComponent(url)}`
          : url;

        setDebugInfo(`Fetching PDF...`);

        const response = await fetch(proxyUrl);
        if (!response.ok) {
          throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        setDebugInfo(`PDF fetched: ${(arrayBuffer.byteLength / 1024).toFixed(0)} KB. Parsing...`);

        if (arrayBuffer.byteLength === 0) {
          throw new Error('PDF file is empty (0 bytes)');
        }

        // Step 2: Load pdfjs-dist
        const pdfjsLib = await import('pdfjs-dist');

        // Step 3: Set worker
        try {
          pdfjsLib.GlobalWorkerOptions.workerSrc =
            `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
        } catch {
          pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        }

        setDebugInfo('Parsing PDF document...');

        // Step 4: Load document from ArrayBuffer (no CORS issues — pdf.js never fetches)
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        if (!cancelled) {
          setPdfDoc(pdf);
          setTotalPages(pdf.numPages);
          setCurrentPage(1);
          setLoading(false);
          setDebugInfo('');
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[PDFViewer] Error:', err);
          setError(err.message || 'Failed to load PDF');
          setDebugInfo('');
          setLoading(false);
        }
      }
    };

    loadPDF();
    return () => { cancelled = true; };
  }, [url]);

  // Render page to canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || renderingRef.current) return;

    const renderPage = async () => {
      renderingRef.current = true;
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport }).promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('[PDFViewer] Render error:', err);
        }
      } finally {
        renderingRef.current = false;
      }
    };

    renderPage();
  }, [pdfDoc, currentPage, scale]);

  // Auto-fit width
  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;
    const fitWidth = async () => {
      try {
        const page = await pdfDoc.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const containerWidth = containerRef.current?.clientWidth || 800;
        setScale(Math.min((containerWidth - 40) / viewport.width, 2));
      } catch {}
    };
    fitWidth();
  }, [pdfDoc]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[70vh] bg-white rounded-md">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-primary-main mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading PDF...</p>
          {debugInfo && <p className="text-xs text-gray-400 mt-1">{debugInfo}</p>}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-[70vh] bg-white rounded-md">
        <div className="text-center max-w-sm">
          <AlertCircle size={36} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-500 text-sm mb-1">Failed to load PDF</p>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
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
    );
  }

  return (
    <div className="flex flex-col h-[80vh] bg-white rounded-md overflow-hidden">
      {/* Controls */}
      <div className="flex items-center justify-between bg-gray-800 text-white px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 hover:bg-white/10 rounded disabled:opacity-30">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm min-w-[90px] text-center">
            Page {currentPage} of {totalPages}
          </span>
          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 hover:bg-white/10 rounded disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
            className="p-1.5 hover:bg-white/10 rounded">
            <ZoomOut size={18} />
          </button>
          <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.min(3, s + 0.25))}
            className="p-1.5 hover:bg-white/10 rounded">
            <ZoomIn size={18} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 flex justify-center p-4">
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  );
}
