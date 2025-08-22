'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useProjectStore } from '../lib/store';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Play, Pause } from 'lucide-react';

interface CanvasPreviewProps {
  className?: string;
}

export function CanvasPreview({ className }: CanvasPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const { videoFile, videoDetails, metadata, channelHandle, subscriberCount } =
    useProjectStore();

  // State for preview settings
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [mode, setMode] = useState<'blur' | 'crop'>('blur');
  const [showSafeZones, setShowSafeZones] = useState(true);
  const [scale, setScale] = useState(1);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  const [isRendering, setIsRendering] = useState(false);

  // Initialize Web Worker
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Create worker from blob to avoid CORS issues
      const workerCode = `
        // Web Worker for handling OffscreenCanvas operations
        let canvas = null;
        let ctx = null;
        let currentSettings = null;

        self.onmessage = async (event) => {
          const { type, data } = event.data;

          try {
            switch (type) {
              case 'init':
                await initCanvas(data);
                break;
              case 'render':
                await renderFrame(data);
                break;
              case 'updateSettings':
                updateSettings(data);
                break;
              default:
                console.warn('Unknown message type:', type);
            }
          } catch (error) {
            console.error('Worker error:', error);
            self.postMessage({
              type: 'error',
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        };

        async function initCanvas(data) {
          canvas = data.canvas;
          ctx = canvas.getContext('2d');
          
          if (!ctx) {
            throw new Error('Failed to get 2D context from OffscreenCanvas');
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          self.postMessage({ type: 'ready' });
        }

        function updateSettings(settings) {
          currentSettings = settings;
        }

        async function renderFrame(data) {
          if (!canvas || !ctx || !currentSettings) {
            throw new Error('Canvas not initialized');
          }

          const { videoFrame, metadata, settings } = data;
          currentSettings = settings;

          // Clear canvas
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Calculate dimensions for 9:16 aspect ratio
          const canvasAspect = 9 / 16;
          const frameAspect = videoFrame.width / videoFrame.height;
          
          let drawWidth, drawHeight, offsetX, offsetY;

          if (settings.mode === 'blur') {
            // Blur mode: fit video within canvas, blur edges
            if (frameAspect > canvasAspect) {
              drawHeight = canvas.height;
              drawWidth = drawHeight * frameAspect;
              offsetX = (canvas.width - drawWidth) / 2;
              offsetY = 0;
            } else {
              drawWidth = canvas.width;
              drawHeight = drawWidth / frameAspect;
              offsetX = 0;
              offsetY = (canvas.height - drawHeight) / 2;
            }
          } else {
            // Crop mode: fill canvas, crop video
            if (frameAspect > canvasAspect) {
              drawWidth = canvas.width;
              drawHeight = drawWidth / frameAspect;
              offsetX = 0;
              offsetY = (canvas.height - drawHeight) / 2;
            } else {
              drawHeight = canvas.height;
              drawWidth = drawHeight * frameAspect;
              offsetX = (canvas.width - drawWidth) / 2;
              offsetY = 0;
            }
          }

          // Draw background (black)
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          if (settings.mode === 'blur') {
            await drawBlurredBackground(videoFrame, canvas.width, canvas.height);
          }

          // Draw video frame
          ctx.drawImage(videoFrame, offsetX, offsetY, drawWidth, drawHeight);

          // Draw safe zone overlays if enabled
          if (settings.showSafeZones) {
            drawSafeZones();
          }

          // Draw title and channel info
          drawOverlay(metadata);

          // Send the rendered frame back to main thread
          const imageBitmap = await createImageBitmap(canvas);
          self.postMessage({
            type: 'frameRendered',
            imageBitmap
          }, [imageBitmap]);
        }

        async function drawBlurredBackground(videoFrame, canvasWidth, canvasHeight) {
          if (!ctx) return;

          const tempCanvas = new OffscreenCanvas(canvasWidth, canvasHeight);
          const tempCtx = tempCanvas.getContext('2d');
          
          if (!tempCtx) return;

          const frameAspect = videoFrame.width / videoFrame.height;
          const canvasAspect = canvasWidth / canvasHeight;
          
          let scale, offsetX, offsetY;
          
          if (frameAspect > canvasAspect) {
            scale = canvasHeight / videoFrame.height;
            offsetX = (canvasWidth - videoFrame.width * scale) / 2;
            offsetY = 0;
          } else {
            scale = canvasWidth / videoFrame.width;
            offsetX = 0;
            offsetY = (canvasHeight - videoFrame.height * scale) / 2;
          }

          tempCtx.drawImage(
            videoFrame,
            offsetX, offsetY,
            videoFrame.width * scale,
            videoFrame.height * scale
          );

          // Apply blur effect
          const blurRadius = 20;
          for (let i = 0; i < 3; i++) {
            tempCtx.filter = \`blur(\${blurRadius}px)\`;
            tempCtx.drawImage(tempCanvas, 0, 0);
          }

          ctx.drawImage(tempCanvas, 0, 0);
        }

        function drawSafeZones() {
          if (!ctx || !canvas) return;

          const { width, height } = canvas;
          
          // Top safe area
          const topSafeHeight = height * 0.15;
          ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
          ctx.fillRect(0, 0, width, topSafeHeight);
          
          // Bottom safe area
          const bottomSafeHeight = height * 0.2;
          ctx.fillStyle = 'rgba(0, 0, 255, 0.1)';
          ctx.fillRect(0, height - bottomSafeHeight, width, bottomSafeHeight);
          
          // Border lines
          ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, topSafeHeight);
          ctx.lineTo(width, topSafeHeight);
          ctx.stroke();
          
          ctx.strokeStyle = 'rgba(0, 0, 255, 0.5)';
          ctx.beginPath();
          ctx.moveTo(0, height - bottomSafeHeight);
          ctx.lineTo(width, height - bottomSafeHeight);
          ctx.stroke();
        }

        function drawOverlay(metadata) {
          if (!ctx || !canvas) return;

          const { width, height } = canvas;
          
          // Draw title
          if (metadata.title) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            
            const maxWidth = width * 0.8;
            let displayTitle = metadata.title;
            while (ctx.measureText(displayTitle).width > maxWidth && displayTitle.length > 0) {
              displayTitle = displayTitle.slice(0, -1);
            }
            if (displayTitle !== metadata.title) {
              displayTitle += '...';
            }
            
            ctx.fillText(displayTitle, width / 2, height * 0.05);
            
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
          }
          
          // Draw channel info
          const channelY = height * 0.75;
          const avatarSize = 40;
          const avatarX = width * 0.1;
          
          ctx.fillStyle = '#666666';
          ctx.beginPath();
          ctx.arc(avatarX + avatarSize / 2, channelY + avatarSize / 2, avatarSize / 2, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 2;
          ctx.shadowOffsetX = 1;
          ctx.shadowOffsetY = 1;
          
          const channelNameX = avatarX + avatarSize + 12;
          ctx.fillText(metadata.channelName, channelNameX, channelY + avatarSize / 2);
          
          if (metadata.subscriberCount) {
            ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillStyle = '#CCCCCC';
            ctx.fillText(metadata.subscriberCount, channelNameX, channelY + avatarSize / 2 + 20);
          }
          
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      workerRef.current = new Worker(workerUrl);

      workerRef.current.onmessage = (event) => {
        const { type, imageBitmap, error } = event.data;

        switch (type) {
          case 'ready':
            setIsWorkerReady(true);
            break;
          case 'frameRendered':
            if (imageBitmap && canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx) {
                ctx.clearRect(
                  0,
                  0,
                  canvasRef.current.width,
                  canvasRef.current.height
                );
                ctx.drawImage(imageBitmap, 0, 0);
                imageBitmap.close();
              }
            }
            setIsRendering(false);
            break;
          case 'error':
            console.error('Worker error:', error);
            setIsRendering(false);
            break;
        }
      };

      return () => {
        if (workerRef.current) {
          workerRef.current.terminate();
        }
        URL.revokeObjectURL(workerUrl);
      };
    } catch (error) {
      console.error('Failed to create worker:', error);
    }
  }, []);

  // Initialize canvas when worker is ready
  useEffect(() => {
    if (!isWorkerReady || !workerRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const offscreenCanvas = canvas.transferControlToOffscreen();

    workerRef.current.postMessage(
      {
        type: 'init',
        data: { canvas: offscreenCanvas },
      },
      [offscreenCanvas]
    );
  }, [isWorkerReady]);

  // Handle video metadata
  useEffect(() => {
    if (!videoRef.current || !videoDetails) return;

    const video = videoRef.current;
    video.addEventListener('loadedmetadata', () => {
      setDuration(video.duration);
    });

    video.addEventListener('timeupdate', () => {
      setCurrentTime(video.currentTime);
    });

    return () => {
      video.removeEventListener('loadedmetadata', () => {});
      video.removeEventListener('timeupdate', () => {});
    };
  }, [videoDetails]);

  // Render frame when needed
  const renderFrame = useCallback(async () => {
    if (
      !workerRef.current ||
      !isWorkerReady ||
      !videoRef.current ||
      isRendering
    )
      return;

    const video = videoRef.current;
    if (video.paused || video.ended) return;

    try {
      setIsRendering(true);

      // Create ImageBitmap from current video frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      const imageBitmap = await createImageBitmap(canvas);

      // Send to worker for rendering
      workerRef.current.postMessage(
        {
          type: 'render',
          data: {
            videoFrame: imageBitmap,
            metadata: {
              title: metadata?.title || 'Untitled Video',
              channelName: channelHandle || 'Unknown Channel',
              subscriberCount: subscriberCount || '',
            },
            settings: {
              mode,
              showSafeZones,
              scale,
            },
          },
        },
        [imageBitmap]
      );
    } catch (error) {
      console.error('Failed to render frame:', error);
      setIsRendering(false);
    }
  }, [
    workerRef,
    isWorkerReady,
    metadata,
    channelHandle,
    subscriberCount,
    mode,
    showSafeZones,
    scale,
    isRendering,
  ]);

  // Animation loop for rendering
  useEffect(() => {
    if (!isPlaying || !isWorkerReady) return;

    const renderLoop = () => {
      renderFrame();
      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isWorkerReady, renderFrame]);

  // Update worker settings when they change
  useEffect(() => {
    if (!workerRef.current || !isWorkerReady) return;

    workerRef.current.postMessage({
      type: 'updateSettings',
      data: { mode, showSafeZones, scale },
    });
  }, [mode, showSafeZones, scale, isWorkerReady]);

  // Handle play/pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  // Handle seek
  const handleSeek = useCallback((value: number[]) => {
    if (!videoRef.current) return;
    const newTime = value[0];
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }, []);

  // Format time for display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (!videoFile || !videoDetails) {
    return (
      <div
        className={`flex items-center justify-center bg-muted rounded-lg ${className}`}
      >
        <div className="text-center text-muted-foreground">
          <p className="text-sm">Upload a video to see preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Canvas Preview */}
      <div className="relative mx-auto max-w-sm">
        <canvas
          ref={canvasRef}
          width={360}
          height={640}
          className="w-full h-auto border rounded-lg bg-black"
        />

        {/* Loading overlay */}
        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
            <div className="text-white text-sm">Rendering...</div>
          </div>
        )}
      </div>

      {/* Video Element (hidden) */}
      <video
        ref={videoRef}
        src={URL.createObjectURL(videoFile.file)}
        className="hidden"
        preload="metadata"
        crossOrigin="anonymous"
      />

      {/* Controls */}
      <div className="space-y-4">
        {/* Playback Controls */}
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={togglePlay}
            disabled={!isWorkerReady}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <Slider
            value={[currentTime]}
            onValueChange={handleSeek}
            max={duration}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Settings */}
        <div className="space-y-3 p-4 border rounded-lg">
          <div className="flex items-center justify-between">
            <Label htmlFor="mode" className="text-sm font-medium">
              Display Mode
            </Label>
            <div className="flex space-x-2">
              <Button
                variant={mode === 'blur' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('blur')}
              >
                Blur Edges
              </Button>
              <Button
                variant={mode === 'crop' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMode('crop')}
              >
                Smart Crop
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="safe-zones" className="text-sm font-medium">
              Safe Zone Guides
            </Label>
            <Switch
              id="safe-zones"
              checked={showSafeZones}
              onCheckedChange={setShowSafeZones}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="scale" className="text-sm font-medium">
              Preview Scale: {scale.toFixed(1)}x
            </Label>
            <Slider
              id="scale"
              value={[scale]}
              onValueChange={(value) => setScale(value[0])}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
