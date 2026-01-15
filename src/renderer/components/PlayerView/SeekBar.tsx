import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SeekBarProps {
  currentTime: number;
  duration: number;
  isVisible: boolean;
  isPlaying: boolean;
  videoId?: string;
  isMini?: boolean;
}

export function SeekBar({ currentTime, duration, isVisible, isPlaying, videoId, isMini }: SeekBarProps) {
  const [visualTime, setVisualTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const prevVideoIdRef = useRef(videoId);

  // Reset visual time when track changes (videoId changes)
  React.useEffect(() => {
    if (prevVideoIdRef.current !== videoId) {
      setVisualTime(0);
      lastUpdateTimeRef.current = Date.now();
      prevVideoIdRef.current = videoId;
    }
  }, [videoId]);

  // Sync visual time with currentTime from Main Process
  React.useEffect(() => {
    setVisualTime(currentTime);
    lastUpdateTimeRef.current = Date.now();
  }, [currentTime]);

  // Smooth interpolation loop (only when playing)
  React.useEffect(() => {
    if (!isPlaying || duration <= 0) return;

    let frameId: number;
    const animate = () => {
      if (!isDragging) {
        const now = Date.now();
        const delta = (now - lastUpdateTimeRef.current) / 1000;
        lastUpdateTimeRef.current = now;

        setVisualTime(prev => Math.min(prev + delta, duration));
      }
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, isDragging, duration]);

  // Display time: use drag position while dragging, otherwise use visual interpolation
  const displayTime = isDragging && dragTime !== null ? dragTime : visualTime;

  // Duration validation: only display if duration is valid
  const displayDuration = duration > 0 ? duration : 0;
  const progress = displayDuration > 0 ? (displayTime / displayDuration) * 100 : 0;

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateTimeFromPosition = (clientX: number): number => {
    if (!progressBarRef.current || duration <= 0) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const ratio = x / rect.width;
    const time = ratio * duration;

    return Math.max(0, Math.min(duration, time));
  };

  const handleSeek = (clientX: number) => {
    const seekTime = calculateTimeFromPosition(clientX);
    window.electronAPI.playbackSeek(seekTime);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    const time = calculateTimeFromPosition(e.clientX);
    setDragTime(time);
    handleSeek(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const time = calculateTimeFromPosition(e.clientX);
    setHoverTime(time);

    if (isDragging) {
      setDragTime(time);
      // Removed: window.electronAPI.playbackSeek(time);
      // We only seek on MouseUp to prevent massive seek requests that can confuse the player backend
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isDragging) {
      const time = calculateTimeFromPosition(e.clientX);
      window.electronAPI.playbackSeek(time);
      setIsDragging(false);
      setDragTime(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = (e: MouseEvent) => {
        if (isDragging) {
          const time = calculateTimeFromPosition(e.clientX);
          window.electronAPI.playbackSeek(time);
          setIsDragging(false);
          setDragTime(null);
        }
      };
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          const time = calculateTimeFromPosition(e.clientX);
          setDragTime(time);
        }
      };

      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('mousemove', handleGlobalMouseMove);

      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [isDragging, duration]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={`w-full ${isMini ? 'max-w-md' : 'max-w-lg'} flex flex-col gap-2`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Progress bar */}
          <div
            ref={progressBarRef}
            className="relative w-full h-2 bg-white/10 backdrop-blur-md rounded-full cursor-pointer group"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            {/* Hover preview */}
            {hoverTime !== null && (
              <div
                className="absolute -top-8 transform -translate-x-1/2 px-2 py-1 bg-black/80 backdrop-blur-md rounded text-xs text-white pointer-events-none"
                style={{ left: `${(hoverTime / duration) * 100}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Progress fill */}
            <div
              className="absolute inset-y-0 left-0 bg-white rounded-full"
              style={{ width: `${progress}%` }}
            />

            {/* Drag handle */}
            <div
              className={`absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 ${isMini ? 'w-3 h-3' : 'w-4 h-4'} bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg`}
              style={{ left: `${progress}%` }}
            />
          </div>

          {/* Time labels */}
          <div className="flex justify-between items-center px-1">
            <span className={`${isMini ? 'text-xs' : 'text-sm'} text-white/70`}>
              {formatTime(displayTime)}
            </span>
            <span className={`${isMini ? 'text-xs' : 'text-sm'} text-white/70`}>
              {formatTime(duration)}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
