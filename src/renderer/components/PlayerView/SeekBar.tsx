import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SeekBarProps {
  currentTime: number;
  duration: number;
  isVisible: boolean;
  isMini?: boolean;
  isPlaying: boolean;
}

export function SeekBar({ currentTime, duration, isVisible, isMini, isPlaying }: SeekBarProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [visualTime, setVisualTime] = useState(currentTime);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | undefined>(undefined);

  // Sync visual time with prop time when it updates from backend
  // But also allow for local interpolation
  React.useEffect(() => {
    if (!isDragging) {
      setVisualTime(currentTime);
      lastUpdateTimeRef.current = Date.now();
    }
  }, [currentTime, isDragging]);

  // Interpolation loop
  React.useEffect(() => {
    if (!isPlaying || isDragging) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateTimeRef.current) / 1000;

      // Update visual time based on elapsed real time
      // We rely on the useEffect above to "re-anchor" us to the server time every ~2 seconds
      // This prevents drift from accumulating too much.
      setVisualTime(prev => {
        const next = prev + deltaTime;
        return Math.min(next, duration);
      });

      lastUpdateTimeRef.current = now;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastUpdateTimeRef.current = Date.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isDragging, duration, currentTime]); // Dependency on currentTime ensures we restart loop base on new anchor if needed (though the other effect handles the set)

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Use visualTime for display, but hoverTime overrides it for the preview label
  const displayTime = isDragging && hoverTime !== null ? hoverTime : visualTime;
  const progress = duration > 0 ? (displayTime / duration) * 100 : 0;

  const handleSeek = (clientX: number) => {
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    const seekTime = (x / width) * duration;

    window.electronAPI.playbackSeek(Math.max(0, Math.min(duration, seekTime)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSeek(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!progressBarRef.current) return;

    const rect = progressBarRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const time = (x / width) * duration;
    setHoverTime(Math.max(0, Math.min(duration, time)));

    if (isDragging) {
      handleSeek(e.clientX);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
    if (isDragging) {
      setIsDragging(false);
    }
  };

  React.useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isDragging) {
          handleSeek(e.clientX);
        }
      };

      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('mousemove', handleGlobalMouseMove);

      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [isDragging]);

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
              {formatTime(visualTime)}
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
