'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Maximize,
  Minimize,
  Download,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  title?: string;
  subtitle?: string; // VTT URL
  downloadable?: boolean;
  onProgress?: (percent: number) => void;
  onEnded?: () => void;
  className?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

function getYouTubeVideoId(url: string): string | null {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

// ─── Main Export ─────────────────────────────────────────────

export default function VideoPlayer(props: VideoPlayerProps) {
  if (isYouTubeUrl(props.src)) {
    return (
      <YouTubePlayer
        src={props.src}
        onProgress={props.onProgress}
        onEnded={props.onEnded}
        className={props.className}
      />
    );
  }
  return <DirectVideoPlayer {...props} />;
}

// ─── YouTube Player (IFrame API) ─────────────────────────────

interface YouTubePlayerProps {
  src: string;
  onProgress?: (percent: number) => void;
  onEnded?: () => void;
  className?: string;
}

function YouTubePlayer({ src, onProgress, onEnded, className = '' }: YouTubePlayerProps) {
  const playerRef = useRef<YTPlayer | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerId = useRef(`yt-player-${Math.random().toString(36).slice(2, 9)}`);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);

  const videoId = getYouTubeVideoId(src);

  // Keep callback refs current without re-triggering the effect
  useEffect(() => {
    onProgressRef.current = onProgress;
  }, [onProgress]);
  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    if (!videoId) return;

    const clearTracking = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const initPlayer = () => {
      const YT = (window as unknown as WindowWithYT).YT;
      if (!YT?.Player) {
        setTimeout(initPlayer, 200);
        return;
      }

      playerRef.current = new YT.Player(playerId.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, autoplay: 0 },
        events: {
          onStateChange: (event: YTStateChangeEvent) => {
            const states = (window as unknown as WindowWithYT).YT?.PlayerState;
            if (!states) return;

            // Video ended
            if (event.data === states.ENDED) {
              onProgressRef.current?.(100);
              onEndedRef.current?.();
              clearTracking();
            }

            // Video playing — start progress polling
            if (event.data === states.PLAYING) {
              clearTracking();
              intervalRef.current = setInterval(() => {
                const player = playerRef.current;
                if (player?.getDuration && player?.getCurrentTime) {
                  const dur = player.getDuration();
                  const cur = player.getCurrentTime();
                  if (dur > 0) {
                    onProgressRef.current?.((cur / dur) * 100);
                  }
                }
              }, 2000);
            }

            // Video paused — stop polling
            if (event.data === states.PAUSED) {
              clearTracking();
            }
          },
        },
      });
    };

    // Load YouTube IFrame API script if not already present
    if (!(window as unknown as WindowWithYT).YT?.Player) {
      const exists = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );
      if (!exists) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(script);
      }
      (window as unknown as WindowWithYT).onYouTubeIframeAPIReady = initPlayer;
    } else {
      initPlayer();
    }

    return () => {
      clearTracking();
      try {
        playerRef.current?.destroy?.();
      } catch {
        // player may already be destroyed
      }
    };
  }, [videoId]);

  if (!videoId) {
    return <p className="text-error p-4">Invalid YouTube URL</p>;
  }

  return (
    <div
      className={`relative w-full rounded-md overflow-hidden bg-black ${className}`}
      style={{ paddingTop: '56.25%' }}
    >
      <div
        id={playerId.current}
        className="absolute top-0 left-0 w-full h-full"
      />
    </div>
  );
}

// Minimal type stubs for the YouTube IFrame API
interface YTPlayer {
  destroy?: () => void;
  getDuration?: () => number;
  getCurrentTime?: () => number;
}

interface YTPlayerState {
  ENDED: number;
  PLAYING: number;
  PAUSED: number;
}

interface YTStateChangeEvent {
  data: number;
}

interface WindowWithYT {
  YT?: {
    Player: new (
      id: string,
      opts: Record<string, unknown>,
    ) => YTPlayer;
    PlayerState?: YTPlayerState;
  };
  onYouTubeIframeAPIReady?: () => void;
}

// ─── Direct Video Player ─────────────────────────────────────

function DirectVideoPlayer({
  src,
  title,
  subtitle,
  downloadable = false,
  onProgress,
  onEnded,
  className = '',
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const togglePlay = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (video.paused) {
        await video.play();
        setPlaying(true);
      } else {
        video.pause();
        setPlaying(false);
      }
    } catch (err) {
      console.error('Playback error:', err);
      setError(true);
    }
  };

  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(
      0,
      Math.min(video.currentTime + seconds, duration)
    );
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    video.currentTime = pct * duration;
  };

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  // Track time + fire callbacks
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (duration > 0) {
        onProgress?.((video.currentTime / duration) * 100);
      }
    };
    const onLoadedMetadata = () => setDuration(video.duration);
    const handleEnded = () => {
      setPlaying(false);
      onProgress?.(100);
      onEnded?.();
    };
    const onError = () => setError(true);

    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', onError);

    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', onError);
    };
  }, [duration, onProgress, onEnded]);

  // Fullscreen change listener
  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  if (error) {
    return (
      <div
        className={`w-full bg-gray-900 rounded-md p-8 text-center ${className}`}
      >
        <p className="text-white text-body-md mb-2">
          Unable to play this video
        </p>
        <p className="text-gray-400 text-caption mb-4">
          The video format may not be supported or the URL is invalid.
        </p>
        <a
          href={src}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-main underline text-body-md"
        >
          Open video in new tab
        </a>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-md bg-black group ${className}`}
    >
      {/* Video */}
      <video
        ref={videoRef}
        src={src}
        className="w-full cursor-pointer"
        onClick={togglePlay}
        playsInline
        preload="metadata"
      >
        {subtitle && (
          <track kind="subtitles" src={subtitle} srcLang="en" default />
        )}
      </video>

      {/* Play overlay (shown when paused) */}
      {!playing && !error && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-16 h-16 rounded-full bg-primary-main flex items-center justify-center shadow-md hover:bg-primary-hover transition-colors">
            <Play className="h-7 w-7 text-white ml-[2px]" fill="white" />
          </div>
        </div>
      )}

      {/* Title overlay */}
      {title && !playing && (
        <div className="absolute left-0 top-0 p-md">
          <p className="text-body-lg font-medium text-white drop-shadow">
            {title}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-md pb-md pt-xl opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Progress Bar */}
        <div
          className="mb-sm h-[4px] w-full cursor-pointer rounded-full bg-white/30"
          onClick={seek}
          role="slider"
          aria-label="Video progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
          tabIndex={0}
        >
          <div
            className="h-full rounded-full bg-primary-main transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-md">
            {/* Skip backward */}
            <button
              type="button"
              onClick={() => skip(-10)}
              className="text-white/80 transition-colors hover:text-white"
              aria-label="Rewind 10 seconds"
            >
              <RotateCcw className="h-5 w-5" />
            </button>

            {/* Play/Pause */}
            <button
              type="button"
              onClick={togglePlay}
              className="flex h-[36px] w-[36px] items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="ml-[2px] h-5 w-5" />
              )}
            </button>

            {/* Skip forward */}
            <button
              type="button"
              onClick={() => skip(10)}
              className="text-white/80 transition-colors hover:text-white"
              aria-label="Forward 10 seconds"
            >
              <RotateCw className="h-5 w-5" />
            </button>

            {/* Time */}
            <span className="text-caption text-white/80">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-md">
            {/* Mute */}
            <button
              type="button"
              onClick={() => {
                if (videoRef.current) videoRef.current.muted = !muted;
                setMuted(!muted);
              }}
              className="text-white/80 transition-colors hover:text-white"
              aria-label={muted ? 'Unmute' : 'Mute'}
            >
              {muted ? (
                <VolumeX className="h-5 w-5" />
              ) : (
                <Volume2 className="h-5 w-5" />
              )}
            </button>

            {/* Download */}
            {downloadable && (
              <a
                href={src}
                download
                className="text-white/80 transition-colors hover:text-white"
                aria-label="Download video"
              >
                <Download className="h-5 w-5" />
              </a>
            )}

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreen}
              className="text-white/80 transition-colors hover:text-white"
              aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              {fullscreen ? (
                <Minimize className="h-5 w-5" />
              ) : (
                <Maximize className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
