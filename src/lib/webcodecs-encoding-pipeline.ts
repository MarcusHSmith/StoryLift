import {
  VideoEncoderService,
  VideoEncoderConfig,
} from './video-encoder-service';
import {
  AudioEncoderService,
  AudioEncoderConfig,
} from './audio-encoder-service';
import { WebCodecsService } from './webcodecs-service';

export interface EncodingPipelineConfig {
  video: VideoEncoderConfig;
  audio: AudioEncoderConfig;
  targetBitrate: number;
  targetFps: number;
}

export interface EncodedFrame {
  chunk: EncodedVideoChunk;
  timestamp: number;
  duration: number;
}

export interface EncodingProgress {
  framesEncoded: number;
  totalFrames: number;
  audioChunks: number;
  isComplete: boolean;
  error?: string;
}

export class WebCodecsEncodingPipeline {
  private videoEncoder: VideoEncoderService;
  private audioEncoder: AudioEncoderService;
  private isEncoding = false;
  private encodedFrames: EncodedFrame[] = [];
  private audioChunks: EncodedAudioChunk[] = [];
  private frameCount = 0;
  private totalFrames = 0;
  private onProgress?: (progress: EncodingProgress) => void;

  constructor() {
    this.videoEncoder = new VideoEncoderService();
    this.audioEncoder = new AudioEncoderService();
  }

  /**
   * Initialize the encoding pipeline with the best supported configuration
   */
  async initialize(): Promise<EncodingPipelineConfig> {
    // Check WebCodecs support first
    if (!WebCodecsService.isEncodingSupported()) {
      throw new Error('WebCodecs not supported in this browser');
    }

    // Get detailed support information
    const supportDetails = await WebCodecsService.checkDetailedSupport();

    if (
      !supportDetails.h264.baseline &&
      !supportDetails.h264.main &&
      !supportDetails.h264.high
    ) {
      throw new Error('No H.264 profile supported');
    }

    if (!supportDetails.aac.lc && !supportDetails.aac.he) {
      throw new Error('No AAC profile supported');
    }

    // Initialize video encoder with best supported config
    const videoConfig = await this.videoEncoder.initialize();

    // Initialize audio encoder with best supported config
    await this.audioEncoder.initialize();
    const audioConfig = AudioEncoderService.DEFAULT_CONFIG;

    const config: EncodingPipelineConfig = {
      video: videoConfig,
      audio: audioConfig,
      targetBitrate: 6000000, // 6 Mbps
      targetFps: 30,
    };

    console.log('WebCodecs encoding pipeline initialized:', config);
    return config;
  }

  /**
   * Start the encoding process
   */
  async startEncoding(totalFrames: number): Promise<void> {
    if (this.isEncoding) {
      throw new Error('Encoding already in progress');
    }

    this.totalFrames = totalFrames;
    this.frameCount = 0;
    this.encodedFrames = [];
    this.audioChunks = [];
    this.isEncoding = true;

    // Start both encoders
    await this.videoEncoder.startEncoding();
    await this.audioEncoder.startEncoding();

    console.log(`Started encoding pipeline for ${totalFrames} frames`);
  }

  /**
   * Encode a video frame from the preview pipeline
   * This integrates with the existing preview rendering to avoid duplicate work
   */
  async encodeFrame(
    videoFrame: VideoFrame,
    timestamp: number,
    duration: number
  ): Promise<void> {
    if (!this.isEncoding) {
      throw new Error('Encoding not started');
    }

    try {
      // Encode the video frame
      await this.videoEncoder.encodeFrame(videoFrame, timestamp);

      this.frameCount++;

      // Report progress
      this.reportProgress();
    } catch (error) {
      console.error('Failed to encode frame:', error);
      throw error;
    }
  }

  /**
   * Encode audio data from the source video
   */
  async encodeAudio(
    audioData: Float32Array[],
    timestamp: number,
    duration: number
  ): Promise<void> {
    if (!this.isEncoding) {
      throw new Error('Encoding not started');
    }

    try {
      await this.audioEncoder.encodeAudio({
        data: audioData,
        timestamp,
        duration,
      });

      this.reportProgress();
    } catch (error) {
      console.error('Failed to encode audio:', error);
      throw error;
    }
  }

  /**
   * Stop encoding and get the encoded data
   */
  async stopEncoding(): Promise<{
    videoChunks: EncodedVideoChunk[];
    audioChunks: EncodedAudioChunk[];
    config: EncodingPipelineConfig;
  }> {
    if (!this.isEncoding) {
      throw new Error('Encoding not started');
    }

    this.isEncoding = false;

    try {
      // Stop both encoders and get their chunks
      const videoChunks = await this.videoEncoder.stopEncoding();
      const audioChunks = await this.audioEncoder.stopEncoding();

      console.log(
        `Encoding completed: ${videoChunks.length} video chunks, ${audioChunks.length} audio chunks`
      );

      return {
        videoChunks,
        audioChunks,
        config: {
          video: await this.videoEncoder.initialize(),
          audio: AudioEncoderService.DEFAULT_CONFIG,
          targetBitrate: 6000000,
          targetFps: 30,
        },
      };
    } catch (error) {
      console.error('Failed to stop encoding:', error);
      throw error;
    }
  }

  /**
   * Set progress callback
   */
  setProgressCallback(callback: (progress: EncodingProgress) => void): void {
    this.onProgress = callback;
  }

  /**
   * Report encoding progress
   */
  private reportProgress(): void {
    if (this.onProgress) {
      this.onProgress({
        framesEncoded: this.frameCount,
        totalFrames: this.totalFrames,
        audioChunks: this.audioChunks.length,
        isComplete: false,
      });
    }
  }

  /**
   * Check if encoding is in progress
   */
  getEncodingStatus(): boolean {
    return this.isEncoding;
  }

  /**
   * Get current encoding statistics
   */
  getEncodingStats(): {
    framesEncoded: number;
    totalFrames: number;
    progress: number;
  } {
    return {
      framesEncoded: this.frameCount,
      totalFrames: this.totalFrames,
      progress:
        this.totalFrames > 0 ? (this.frameCount / this.totalFrames) * 100 : 0,
    };
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.videoEncoder.destroy();
    this.audioEncoder.destroy();
    this.isEncoding = false;
    this.encodedFrames = [];
    this.audioChunks = [];
  }
}
