import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SeekBarProps {
  currentTime: number;
  duration: number;
  isVisible: boolean;
  isPlaying: boolean;
  isMini?: boolean;
}

export function SeekBar({ currentTime, duration, isVisible, isPlaying, isMini }: SeekBarProps) {
  const [visualTime, setVisualTime] = useState(currentTime);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [dragTime, setDragTime] = useState<number | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Sync visual time with props whenever currentTime changes significantly (e.g. backend poll or seek)
  React.useEffect(() => {
    setVisualTime(currentTime);
    lastUpdateTimeRef.current = Date.now();
  }, [currentTime]);

  // Use requestAnimationFrame for smooth interpolation ONLY when playing
  React.useEffect(() => {
    const updateTime = () => {
      if (isPlaying && !isDragging) {
        const now = Date.now();
        const deltaTime = (now - lastUpdateTimeRef.current) / 1000;
        lastUpdateTimeRef.current = now;

        setVisualTime(prev => {
          const next = prev + deltaTime;
          return next > duration ? duration : next;
        });
      } else {
        // If not playing, keep refreshing the timestamp to prevent jump when resuming
        lastUpdateTimeRef.current = Date.now();
      }
      animationFrameRef.current = requestAnimationFrame(updateTime);
    };

    animationFrameRef.current = requestAnimationFrame(updateTime);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isDragging, duration]);

  // Display time: use drag position while dragging, otherwise use visual interpolation
  const displayTime = isDragging && dragTime !== null ? dragTime : visualTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

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
