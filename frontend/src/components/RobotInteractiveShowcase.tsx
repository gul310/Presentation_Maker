import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize2,
  Minimize2,
  Film,
  PictureInPicture,
  Rewind,
  FastForward
} from "lucide-react";

interface RobotInteractiveShowcaseProps {
  onNavigate?: (path: string) => void;
}

export const RobotInteractiveShowcase: React.FC<RobotInteractiveShowcaseProps> = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrubRailRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<number | null>(null);

  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(10);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(1);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [bufferedPercent, setBufferedPercent] = useState<number>(0);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hasInteracted, setHasInteracted] = useState<boolean>(false);

  // Video source resolving to public root or relative
  const videoSrc = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/video.mp4`;

  // Autohide controls on inactivity when playing
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      window.clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => {
        setShowControls(false);
      }, 2500);
    }
    return () => {
      if (controlsTimeoutRef.current) {
        window.clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  // Sync fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Video playback controls
  const togglePlayPause = () => {
    setHasInteracted(true);
    if (!videoRef.current) return;
    if (videoRef.current.paused || videoRef.current.ended) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    resetControlsTimer();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (videoRef.current.buffered.length > 0 && videoRef.current.duration > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBufferedPercent(Math.min(100, (bufferedEnd / videoRef.current.duration) * 100));
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    if (videoRef.current.duration && !isNaN(videoRef.current.duration)) {
      setDuration(videoRef.current.duration);
    }
  };

  const toggleMute = () => {
    setHasInteracted(true);
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      setVolume(0.8);
      videoRef.current.volume = 0.8;
    }
    resetControlsTimer();
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHasInteracted(true);
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      const shouldMute = val === 0;
      videoRef.current.muted = shouldMute;
      setIsMuted(shouldMute);
    }
    resetControlsTimer();
  };

  const handleSpeedChange = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
    resetControlsTimer();
  };

  const seekTo = (seconds: number) => {
    setHasInteracted(true);
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(seconds, duration));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
    resetControlsTimer();
  };

  const skipSeconds = (seconds: number) => {
    if (!videoRef.current) return;
    seekTo(videoRef.current.currentTime + seconds);
  };

  const handleScrubClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubRailRef.current) return;
    const rect = scrubRailRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(pct * duration);
  };

  const handleScrubMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrubRailRef.current) return;
    const rect = scrubRailRef.current.getBoundingClientRect();
    const hoverX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, hoverX / rect.width));
    setHoverPosition(hoverX);
    setHoverTime(pct * duration);
  };

  const handleScrubMouseLeave = () => {
    setHoverTime(null);
    setHoverPosition(null);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {
      // Browser PiP restriction fallback
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === " " || e.key === "k") {
      e.preventDefault();
      togglePlayPause();
    } else if (e.key === "m") {
      e.preventDefault();
      toggleMute();
    } else if (e.key === "f") {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      skipSeconds(-2);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      skipSeconds(2);
    }
  };

  return (
    <section className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 my-4">
      {/* Background Glow Accents */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 h-64 bg-gradient-to-r from-amber-500/10 via-[#A8836C]/25 to-orange-400/10 blur-3xl pointer-events-none rounded-full" />

      {/* Header & Video Title */}
      <div className="text-center max-w-3xl mx-auto mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#A8836C]/15 border border-[#A8836C]/35 text-[#A8836C] dark:text-[#FFFFFF] text-xs font-semibold uppercase tracking-wider mb-3 shadow-sm">
          <Film className="w-3.5 h-3.5 text-[#A8836C] animate-pulse" />
          <span>Official AI Commercial Showcase</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
        </div>
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-[#FFFFFF]">
          Meet Aura: <span className="bg-gradient-to-r from-amber-600 via-[#A8836C] to-yellow-600 dark:from-[#FFFFFF] dark:via-[#A39487] dark:to-[#8C7D70] bg-clip-text text-transparent">The Next-Gen AI Presentation Robot</span>
        </h2>
        <p className="mt-2 text-sm sm:text-base text-neutral-600 dark:text-[#F5EEE8]">
          Watch our 3D promotional film showing the seamless transition from pocket idea to an executive-ready presentation deck.
        </p>
      </div>

      {/* Video Container Frame */}
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseMove={resetControlsTimer}
        onMouseEnter={() => setShowControls(true)}
        className={`relative w-full aspect-video rounded-2xl overflow-hidden border border-amber-900/20 dark:border-[#8C7D70]/40 shadow-2xl dark:shadow-[0_20px_50px_-10px_rgba(140,125,112,0.30)] bg-neutral-950 group select-none outline-none ${
          isFullscreen ? "fixed inset-0 z-50 rounded-none border-none max-w-none w-screen h-screen" : ""
        }`}
      >
        {/* Actual Video Element */}
        <video
          ref={videoRef}
          src={videoSrc}
          playsInline
          autoPlay
          muted={isMuted}
          loop
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onClick={togglePlayPause}
          className="w-full h-full object-cover cursor-pointer"
        />

        {/* Cinematic Vignette & Lighting Filter */}
        <div
          onClick={togglePlayPause}
          className="absolute inset-0 bg-gradient-to-t from-neutral-950/70 via-transparent to-neutral-950/20 pointer-events-none"
        />

        {/* Unmute Prompt Banner if autoplaying muted */}
        {isMuted && !hasInteracted && (
          <button
            type="button"
            onClick={toggleMute}
            className="absolute top-4 right-4 z-30 cursor-pointer bg-neutral-900/90 hover:bg-neutral-800 text-[#F9F2E4] border border-[#A8836C]/50 rounded-full px-3.5 py-1.5 shadow-xl flex items-center gap-2 text-xs font-medium backdrop-blur-md transition-all hover:scale-105 animate-pulse"
          >
            <VolumeX className="w-3.5 h-3.5 text-[#A8836C]" />
            <span>Click to Enable Sound & Audio Track</span>
          </button>
        )}

        {/* Large Centered Play/Pause Button on Pause or Hover */}
        {!isPlaying && (
          <div
            onClick={togglePlayPause}
            className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer bg-black/30 backdrop-blur-[2px] transition-all"
          >
            <button
              type="button"
              aria-label="Play Video"
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-tr from-[#77574A] via-[#A8836C] to-[#BF9981] hover:from-[#8F6C56] hover:to-[#D0AE92] text-white flex items-center justify-center shadow-2xl transition-transform hover:scale-110 active:scale-95 group/play"
            >
              <Play className="w-7 h-7 sm:w-9 sm:h-9 fill-current translate-x-0.5" />
            </button>
          </div>
        )}

        {/* Video Player Control Bar (Bottom Chrome) */}
        <div
          className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-neutral-950 via-neutral-950/90 to-transparent pt-10 pb-3 px-4 sm:px-6 transition-opacity duration-300 ${
            showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Timeline Scrubber Bar with Tooltip */}
          <div
            ref={scrubRailRef}
            onClick={handleScrubClick}
            onMouseMove={handleScrubMouseMove}
            onMouseLeave={handleScrubMouseLeave}
            className="relative w-full h-4 group/timeline cursor-pointer flex items-center py-1"
          >
            {/* Timestamp hover tooltip */}
            {hoverTime !== null && hoverPosition !== null && (
              <div
                style={{ left: `${hoverPosition}px` }}
                className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 bg-neutral-900 border border-[#A8836C]/40 text-[#F9F2E4] rounded font-mono text-[11px] shadow-lg pointer-events-none whitespace-nowrap z-30"
              >
                {formatTime(hoverTime)}
              </div>
            )}

            {/* Background Rail */}
            <div className="w-full h-1.5 group-hover/timeline:h-2 rounded-full bg-white/20 overflow-hidden relative transition-all">
              {/* Buffered Progress */}
              <div
                className="h-full bg-white/30 rounded-full transition-all duration-150"
                style={{ width: `${bufferedPercent}%` }}
              />
              {/* Played Progress */}
              <div
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-[#77574A] via-[#A8836C] to-[#BF9981] rounded-full transition-all duration-75"
                style={{ width: `${(currentTime / (duration || 10)) * 100}%` }}
              />
            </div>

            {/* Scrubber Knob */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-[#A8836C] rounded-full border-2 border-white shadow-md transition-all duration-75 scale-0 group-hover/timeline:scale-100"
              style={{ left: `calc(${(currentTime / (duration || 10)) * 100}% - 7px)` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between mt-2 gap-2">
            {/* Left Controls: Play/Pause, Rewind, FastForward, Restart, Timecode */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={togglePlayPause}
                className="w-8 h-8 rounded-lg bg-[#A8836C]/20 hover:bg-[#A8836C]/30 text-[#A8836C] dark:text-[#FFFFFF] flex items-center justify-center transition-colors border border-[#A8836C]/40"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current translate-x-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => skipSeconds(-2)}
                className="hidden sm:flex w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 items-center justify-center transition-colors"
                title="Rewind 2 seconds"
              >
                <Rewind className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => skipSeconds(2)}
                className="hidden sm:flex w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 items-center justify-center transition-colors"
                title="Fast forward 2 seconds"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => seekTo(0)}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center transition-colors"
                title="Replay from start"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Timecode */}
              <div className="font-mono text-xs text-neutral-300 font-semibold tracking-wider ml-1">
                <span className="text-[#A8836C]">{formatTime(currentTime)}</span>
                <span className="text-neutral-500 mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Volume, Speed, PiP, Fullscreen */}
            <div className="flex items-center gap-2">
              {/* Volume Button with hover slider */}
              <div className="flex items-center group/volume bg-white/10 hover:bg-white/20 rounded-lg px-2 py-1 transition-colors">
                <button
                  type="button"
                  onClick={toggleMute}
                  className="text-neutral-200 hover:text-[#A8836C] transition-colors"
                  title={isMuted ? "Unmute (M)" : "Mute (M)"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4 text-[#A8836C]" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-[#A8836C]" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-0 group-hover/volume:w-16 transition-all duration-200 ml-0 group-hover/volume:ml-2 accent-[#A8836C] h-1 cursor-pointer"
                  title="Volume"
                />
              </div>

              {/* Playback Speed Switcher */}
              <button
                type="button"
                onClick={handleSpeedChange}
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 text-xs font-mono transition-colors"
                title="Playback Speed"
              >
                {playbackSpeed}x
              </button>

              {/* Picture in Picture */}
              <button
                type="button"
                onClick={togglePictureInPicture}
                className="hidden sm:flex w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 items-center justify-center transition-colors"
                title="Picture in Picture"
              >
                <PictureInPicture className="w-3.5 h-3.5" />
              </button>

              {/* Fullscreen Button */}
              <button
                type="button"
                onClick={toggleFullscreen}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-300 flex items-center justify-center transition-colors"
                title={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"}
              >
                {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
