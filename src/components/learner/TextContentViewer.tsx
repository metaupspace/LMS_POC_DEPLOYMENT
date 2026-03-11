'use client';
import { useState, useEffect, useRef } from 'react';
import { CheckCircle, Clock, ChevronDown } from 'lucide-react';

interface TextContentViewerProps {
  content: {
    title?: string;
    data: string;
  };
  isCompleted: boolean;
  onComplete: () => void;
}

export default function TextContentViewer({ content, isCompleted, onComplete }: TextContentViewerProps) {
  const [canComplete, setCanComplete] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Calculate reading time based on content length
  // Average reading speed: ~200 words per minute for non-native English speakers
  // Minimum 5 seconds, maximum 60 seconds
  useEffect(() => {
    if (isCompleted) {
      setCanComplete(true);
      return;
    }

    const textContent = content.data.replace(/<[^>]*>/g, ''); // Strip HTML tags
    const wordCount = textContent.trim().split(/\s+/).length;
    const readingTimeSeconds = Math.min(60, Math.max(5, Math.ceil((wordCount / 200) * 60)));

    setSecondsLeft(readingTimeSeconds);
  }, [content.data, isCompleted]);

  // Countdown timer
  useEffect(() => {
    if (isCompleted || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanComplete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isCompleted, secondsLeft]);

  // Detect scroll to bottom (for long content)
  useEffect(() => {
    const el = contentRef.current;
    if (!el || isCompleted) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      // Consider "scrolled to bottom" when within 50px of the end
      if (scrollTop + clientHeight >= scrollHeight - 50) {
        setHasScrolledToBottom(true);
      }
    };

    // Check if content is short enough to not need scrolling
    if (el.scrollHeight <= el.clientHeight + 10) {
      setHasScrolledToBottom(true);
    }

    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [isCompleted]);

  const handleComplete = () => {
    if (!canComplete || isCompleted) return;
    onComplete();
  };

  // Format seconds as "Xs" or "X:XX"
  const formatTime = (s: number) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  return (
    <div>
      {/* Scrollable text content area */}
      <div
        ref={contentRef}
        className="bg-white rounded-md border border-border-light overflow-y-auto"
        style={{ maxHeight: '60vh' }}
      >
        <div className="p-4 sm:p-6 prose prose-sm sm:prose max-w-none">
          <div dangerouslySetInnerHTML={{ __html: content.data }} />
        </div>
      </div>

      {/* Scroll indicator (if content is tall and not scrolled to bottom) */}
      {!hasScrolledToBottom && !isCompleted && (
        <div className="flex items-center justify-center gap-1 py-2 text-caption text-text-secondary animate-bounce">
          <ChevronDown size={14} />
          <span>Scroll down to read more</span>
        </div>
      )}

      {/* Mark as Read button or Completed state */}
      <div className="mt-3">
        {isCompleted ? (
          <div className="flex items-center justify-center gap-2 py-3 rounded-sm bg-green-50 border border-success/30">
            <CheckCircle size={18} className="text-success" />
            <span className="text-success font-medium text-body-md">Completed</span>
          </div>
        ) : (
          <button
            onClick={handleComplete}
            disabled={!canComplete}
            className={`w-full py-3 rounded-sm text-body-md font-medium transition-all flex items-center justify-center gap-2 ${
              canComplete
                ? 'bg-primary-main text-white hover:bg-primary-hover active:scale-[0.98]'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {canComplete ? (
              <>
                <CheckCircle size={18} />
                Mark as Read
              </>
            ) : (
              <>
                <Clock size={16} className="animate-spin-slow" />
                Reading... {formatTime(secondsLeft)} remaining
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
