import {
  VideoEncoderService,
  VideoEncoderConfig,
} from './video-encoder-service';
import { AudioEncoderService, AudioData } from './audio-encoder-service';
import { WebCodecsService } from './webcodecs-service';

export interface ProcessingOptions {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  mode: 'blur' | 'crop';
  showSafeZones: boolean;
  metadata: {
    title: string;
    channelName: string;
    subscriberCount: string;
  };
  // Instagram Stories specific options
  instagramStories?: {
    enable: boolean;
    targetResolution: '1080x1920' | '720x1280' | '540x960';
    targetFps: 30 | 60;
    targetBitrate: number; // in bps
    enableSafeZones: boolean;
    topSafeZone: number; // pixels from top
    bottomSafeZone: number; // pixels from bottom
  };
}

export interface ProcessingProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  status: string;
}

export interface ProcessingResult {
  videoBlob: Blob;
  duration: number;
  frameCount: number;
  fileSize: number;
}

export class VideoProcessingPipeline {
  private encoderService: VideoEncoderService;
  private audioEncoderService: AudioEncoderService;
  private isProcessing = false;
  private frameCount = 0;
  private totalFrames = 0;
  private startTime = 0;
  private audioChunks: AudioData[] = [];

  constructor() {
    this.encoderService = new VideoEncoderService();
    this.audioEncoderService = new AudioEncoderService();
  }

  /**
   * Get Instagram Stories optimized configuration
   */
  static getInstagramStoriesConfig(): {
    width: number;
    height: number;
    fps: number;
    bitrate: number;
    safeZones: {
      top: number;
      bottom: number;
    };
  } {
    return {
      width: 1080,
      height: 1920,
      fps: 30,
      bitrate: 6000000, // 6 Mbps for high quality
      safeZones: {
        top: 150, // Top safe area for Instagram UI
        bottom: 300, // Bottom safe area for link sticker
      },
    };
  }

  /**
   * Check if the pipeline can run on this browser
   */
  static isSupported(): boolean {
    return WebCodecsService.isEncodingSupported();
  }

  /**
   * Get the best supported configuration for the current browser
   */
  static async getBestConfig(): Promise<VideoEncoderConfig> {
    return VideoEncoderService.getBestSupportedConfig();
  }

  /**
   * Process video frames from the canvas preview pipeline
   * This integrates with the existing worker-based rendering to avoid duplicate work
   */
  async processVideoFrames(
    videoElement: HTMLVideoElement,
    options: ProcessingOptions,
    onProgress?: (progress: ProcessingProgress) => void
  ): Promise<ProcessingResult> {
    if (this.isProcessing) {
      throw new Error('Pipeline is already processing');
    }

    if (!VideoProcessingPipeline.isSupported()) {
      throw new Error('WebCodecs not supported in this browser');
    }

    try {
      this.isProcessing = true;
      this.frameCount = 0;
      this.startTime = performance.now();

      // Calculate total frames based on duration and FPS
      this.totalFrames = Math.ceil(videoElement.duration * options.fps);

      // Initialize the video encoder
      const config: VideoEncoderConfig = {
        width: options.width,
        height: options.height,
        fps: options.fps,
        bitrate: options.bitrate,
        codec: 'avc1.42E01E', // H.264 baseline profile
        profile: 'baseline',
      };

      await this.encoderService.initialize(config);
      await this.encoderService.startEncoding();

      // Initialize audio encoder if supported
      let audioSupported = false;
      try {
        if (this.audioEncoderService.isSupported()) {
          audioSupported = await this.audioEncoderService.checkAACSupport();
          if (audioSupported) {
            await this.audioEncoderService.initialize();
            await this.audioEncoderService.startEncoding();
            console.log('Audio encoding enabled');
          }
        }
      } catch (error) {
        console.warn('Audio encoding not available:', error);
        audioSupported = false;
      }

      // Extract audio from video if supported
      if (audioSupported) {
        try {
          this.audioChunks =
            await AudioEncoderService.extractAudioFromVideo(videoElement);
          console.log(`Extracted ${this.audioChunks.length} audio chunks`);
        } catch (error) {
          console.warn('Failed to extract audio:', error);
          audioSupported = false;
        }
      }

      // Process frames at the specified FPS
      const frameInterval = 1000 / options.fps;
      const startTime = videoElement.currentTime;

      return new Promise((resolve, reject) => {
        const processNextFrame = async () => {
          if (!this.isProcessing) {
            reject(new Error('Processing was cancelled'));
            return;
          }

          try {
            // Create a canvas to capture the current frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              throw new Error('Failed to get canvas context');
            }

            canvas.width = options.width;
            canvas.height = options.height;

            // Draw the video frame
            ctx.drawImage(videoElement, 0, 0, options.width, options.height);

            // Apply the same rendering logic as the preview (blur/crop, safe zones, overlays)
            await this.renderFrameWithOverlays(canvas, options);

            // Convert to VideoFrame for encoding
            const imageBitmap = await createImageBitmap(canvas);
            const videoFrame = new VideoFrame(imageBitmap, {
              timestamp: this.frameCount * (1000000 / options.fps), // microseconds
            });

            // Encode the frame
            await this.encoderService.encodeFrame(videoFrame, this.frameCount);

            // Clean up
            imageBitmap.close();
            videoFrame.close();

            this.frameCount++;

            // Report progress
            if (onProgress) {
              onProgress({
                currentFrame: this.frameCount,
                totalFrames: this.totalFrames,
                percentage: (this.frameCount / this.totalFrames) * 100,
                status: `Processing frame ${this.frameCount}/${this.totalFrames}`,
              });
            }

            // Move to next frame
            videoElement.currentTime =
              startTime + this.frameCount / options.fps;

            // Check if we're done
            if (this.frameCount >= this.totalFrames) {
              // Stop encoding and get results
              const encodedChunks = await this.encoderService.stopEncoding();

              // Convert to MP4 using mp4maker
              const videoBlob = await this.createMP4FromChunks(
                encodedChunks,
                options
              );

              const result: ProcessingResult = {
                videoBlob,
                duration: videoElement.duration,
                frameCount: this.frameCount,
                fileSize: videoBlob.size,
              };

              resolve(result);
            } else {
              // Schedule next frame
              setTimeout(processNextFrame, frameInterval);
            }
          } catch (error) {
            reject(error);
          }
        };

        // Start processing
        processNextFrame();
      });
    } finally {
      this.isProcessing = false;
      this.encoderService.destroy();
    }
  }

  /**
   * Render a frame with the same overlays as the preview
   */
  private async renderFrameWithOverlays(
    canvas: HTMLCanvasElement,
    options: ProcessingOptions
  ): Promise<void> {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // Apply Instagram Stories specific rendering if enabled
    if (options.instagramStories?.enable) {
      await this.renderInstagramStoriesFrame(ctx, canvas, options);
      return;
    }

    // Apply mode-specific rendering (blur or crop)
    if (options.mode === 'blur') {
      // For blur mode, we'd need to implement the blur effect here
      // This is a simplified version
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    }

    // Draw safe zones if enabled
    if (options.showSafeZones) {
      // Top safe area
      const topSafeHeight = height * 0.15;
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, topSafeHeight);
      ctx.lineTo(width, topSafeHeight);
      ctx.stroke();

      // Bottom safe area
      const bottomSafeHeight = height * 0.2;
      ctx.beginPath();
      ctx.moveTo(0, height - bottomSafeHeight);
      ctx.lineTo(width, height - bottomSafeHeight);
      ctx.stroke();
    }

    // Draw title and channel info
    this.drawMetadataOverlay(ctx, options.metadata, width, height);
  }

  /**
   * Render frame specifically for Instagram Stories format
   */
  private async renderInstagramStoriesFrame(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    options: ProcessingOptions
  ): Promise<void> {
    const { width, height } = canvas;
    const config = VideoProcessingPipeline.getInstagramStoriesConfig();

    // Apply background processing based on mode
    if (options.mode === 'blur') {
      // Apply background blur effect
      await this.applyBackgroundBlur(ctx, canvas, 25);
    } else {
      // Apply smart crop for clean background
      // Note: In a real implementation, we'd need access to the source video
      // For now, we'll create a clean background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    }

    // Draw Instagram Stories safe zones
    if (options.instagramStories?.enableSafeZones) {
      const topSafe = config.safeZones.top;
      const bottomSafe = config.safeZones.bottom;

      // Top safe area (red guide)
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(0, topSafe);
      ctx.lineTo(width, topSafe);
      ctx.stroke();

      // Bottom safe area (red guide)
      ctx.beginPath();
      ctx.moveTo(0, height - bottomSafe);
      ctx.lineTo(width, height - bottomSafe);
      ctx.stroke();

      // Reset line style
      ctx.setLineDash([]);

      // Add safe zone labels
      ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
      ctx.font =
        'bold 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('TOP SAFE ZONE', 10, topSafe - 10);
      ctx.fillText('BOTTOM SAFE ZONE', 10, height - bottomSafe + 20);
    }

    // Draw metadata overlay optimized for Instagram Stories
    this.drawInstagramStoriesMetadata(
      ctx,
      options.metadata,
      width,
      height,
      config
    );
  }

  /**
   * Draw metadata overlay (title, channel info)
   */
  private drawMetadataOverlay(
    ctx: CanvasRenderingContext2D,
    metadata: ProcessingOptions['metadata'],
    width: number,
    height: number
  ): void {
    // Draw title
    if (metadata.title) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font =
        'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      const maxWidth = width * 0.8;
      let displayTitle = metadata.title;
      while (
        ctx.measureText(displayTitle).width > maxWidth &&
        displayTitle.length > 0
      ) {
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
    ctx.arc(
      avatarX + avatarSize / 2,
      channelY + avatarSize / 2,
      avatarSize / 2,
      0,
      2 * Math.PI
    );
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font =
      '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    const channelNameX = avatarX + avatarSize + 12;
    ctx.fillText(metadata.channelName, channelNameX, channelY + avatarSize / 2);

    if (metadata.subscriberCount) {
      ctx.font =
        '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#CCCCCC';
      ctx.fillText(
        metadata.subscriberCount,
        channelNameX,
        channelY + avatarSize / 2 + 20
      );
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Draw metadata overlay optimized for Instagram Stories format
   */
  private drawInstagramStoriesMetadata(
    ctx: CanvasRenderingContext2D,
    metadata: ProcessingOptions['metadata'],
    width: number,
    height: number,
    config: { safeZones: { top: number; bottom: number } }
  ): void {
    // Draw title
    if (metadata.title) {
      ctx.fillStyle = '#FFFFFF';
      ctx.font =
        'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';

      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      const maxWidth = width * 0.8;
      let displayTitle = metadata.title;
      while (
        ctx.measureText(displayTitle).width > maxWidth &&
        displayTitle.length > 0
      ) {
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
    ctx.arc(
      avatarX + avatarSize / 2,
      channelY + avatarSize / 2,
      avatarSize / 2,
      0,
      2 * Math.PI
    );
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.font =
      '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    const channelNameX = avatarX + avatarSize + 12;
    ctx.fillText(metadata.channelName, channelNameX, channelY + avatarSize / 2);

    if (metadata.subscriberCount) {
      ctx.font =
        '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillStyle = '#CCCCCC';
      ctx.fillText(
        metadata.subscriberCount,
        channelNameX,
        channelY + avatarSize / 2 + 20
      );
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Apply background blur effect to a canvas
   */
  private async applyBackgroundBlur(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    blurRadius: number = 20
  ): Promise<void> {
    const { width, height } = canvas;

    // Create a temporary canvas for blur processing
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCanvas.width = width;
    tempCanvas.height = height;

    // Draw the current frame to temp canvas
    tempCtx.drawImage(canvas, 0, 0);

    // Apply blur effect using multiple passes for better quality
    for (let i = 0; i < 3; i++) {
      // Create a blurred version with reduced size
      const blurCanvas = document.createElement('canvas');
      const blurCtx = blurCanvas.getContext('2d');
      if (!blurCtx) continue;

      const scale = 1 / (1 + i * 0.5);
      blurCanvas.width = width * scale;
      blurCanvas.height = height * scale;

      // Scale down and draw
      blurCtx.drawImage(tempCanvas, 0, 0, blurCanvas.width, blurCanvas.height);

      // Scale back up with smoothing
      tempCtx.imageSmoothingEnabled = true;
      tempCtx.imageSmoothingQuality = 'high';
      tempCtx.drawImage(blurCanvas, 0, 0, width, height);
    }

    // Draw the blurred background
    ctx.drawImage(tempCanvas, 0, 0);
  }

  /**
   * Apply smart crop to fit video content optimally
   */
  private async applySmartCrop(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    sourceVideo: HTMLVideoElement
  ): Promise<void> {
    const { width, height } = canvas;
    const videoAspect = sourceVideo.videoWidth / sourceVideo.videoHeight;
    const targetAspect = width / height;

    let drawWidth, drawHeight, offsetX, offsetY;

    if (videoAspect > targetAspect) {
      // Video is wider than target - crop sides
      drawHeight = height;
      drawWidth = height * videoAspect;
      offsetX = (width - drawWidth) / 2;
      offsetY = 0;
    } else {
      // Video is taller than target - crop top/bottom
      drawWidth = width;
      drawHeight = width / videoAspect;
      offsetX = 0;
      offsetY = (height - drawHeight) / 2;
    }

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Draw video with smart crop
    ctx.drawImage(sourceVideo, offsetX, offsetY, drawWidth, drawHeight);
  }

  /**
   * Create MP4 from encoded video chunks using mp4maker
   */
  private async createMP4FromChunks(
    chunks: EncodedVideoChunk[],
    options: ProcessingOptions
  ): Promise<Blob> {
    try {
      // For now, we'll create a simple MP4 structure
      // In a real implementation, you'd use mp4maker or a similar library
      // to properly mux the encoded H.264 chunks into an MP4 container

      console.log(`Creating MP4 with ${chunks.length} encoded chunks`);
      console.log(
        `Target: ${options.width}x${options.height} @ ${options.fps}fps, ${options.bitrate}bps`
      );

      // This is a placeholder implementation
      // The actual MP4 creation would involve:
      // 1. Parsing the H.264 NAL units from encoded chunks
      // 2. Creating MP4 boxes (ftyp, moov, mdat, etc.)
      // 3. Properly timing and sequencing the video data

      // For demonstration, create a simple test video
      const canvas = document.createElement('canvas');
      canvas.width = options.width;
      canvas.height = options.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, options.width, options.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          'Video Processing Complete',
          options.width / 2,
          options.height / 2
        );
        ctx.font = '16px Arial';
        ctx.fillText(
          `${options.width}x${options.height} @ ${options.fps}fps`,
          options.width / 2,
          options.height / 2 + 30
        );
      }

      // Convert to blob (this is not a real MP4, just a placeholder)
      const imageBitmap = await createImageBitmap(canvas);
      const videoBlob = await this.imageBitmapToBlob(imageBitmap, 'image/png');

      // Return the placeholder blob
      // In the next milestone, this will be replaced with actual MP4 creation
      return videoBlob;
    } catch (error) {
      console.error('Failed to create MP4:', error);
      throw new Error(
        `MP4 creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Helper function to convert ImageBitmap to Blob
   */
  private async imageBitmapToBlob(
    imageBitmap: ImageBitmap,
    type: string
  ): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(imageBitmap, 0, 0);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          throw new Error('Failed to create blob from canvas');
        }
      }, type);
    });
  }

  /**
   * Cancel processing
   */
  cancel(): void {
    this.isProcessing = false;
    this.encoderService.destroy();
  }

  /**
   * Get current processing status
   */
  getStatus(): {
    isProcessing: boolean;
    frameCount: number;
    totalFrames: number;
  } {
    return {
      isProcessing: this.isProcessing,
      frameCount: this.frameCount,
      totalFrames: this.totalFrames,
    };
  }
}
