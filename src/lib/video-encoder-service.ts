export interface VideoEncoderConfig {
  width: number;
  height: number;
  fps: number;
  bitrate: number;
  codec: string;
  profile: string;
}

export interface VideoFrameData {
  frame: VideoFrame;
  timestamp: number;
}

export class VideoEncoderService {
  private encoder: VideoEncoder | null = null;
  private isEncoding = false;
  private frameQueue: VideoFrameData[] = [];
  private encodedChunks: EncodedVideoChunk[] = [];

  /**
   * Default configuration for Instagram Stories
   */
  static readonly DEFAULT_CONFIG: VideoEncoderConfig = {
    width: 1080,
    height: 1920,
    fps: 30,
    bitrate: 6000000, // 6 Mbps
    codec: 'avc1.42E01E', // H.264 baseline profile
    profile: 'baseline',
  };

  /**
   * Alternative configuration for main profile (if supported)
   */
  static readonly MAIN_PROFILE_CONFIG: VideoEncoderConfig = {
    width: 1080,
    height: 1920,
    fps: 30,
    bitrate: 6000000, // 6 Mbps
    codec: 'avc1.4D401E', // H.264 main profile
    profile: 'main',
  };

  /**
   * Initialize the video encoder with the specified configuration
   */
  async initialize(
    config: VideoEncoderConfig = VideoEncoderService.DEFAULT_CONFIG
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('VideoEncoder is not supported in this browser');
    }

    // Check if the configuration is supported
    const isSupported = await VideoEncoder.isConfigSupported({
      codec: config.codec,
      width: config.width,
      height: config.height,
      bitrate: config.bitrate,
      framerate: config.fps,
    });

    if (!isSupported.supported) {
      throw new Error(
        `VideoEncoder configuration not supported: ${config.codec}`
      );
    }

    // Create the encoder
    this.encoder = new VideoEncoder({
      output: this.handleEncodedChunk.bind(this),
      error: this.handleEncoderError.bind(this),
    });

    // Configure the encoder
    await this.encoder.configure({
      codec: config.codec,
      width: config.width,
      height: config.height,
      bitrate: config.bitrate,
      framerate: config.fps,
      // Additional H.264 specific options
      avc: {
        format: 'avc',
      },
    });

    console.log(
      `VideoEncoder initialized with ${config.profile} profile: ${config.width}x${config.height} @ ${config.fps}fps`
    );
  }

  /**
   * Check if VideoEncoder is supported
   */
  isSupported(): boolean {
    return typeof VideoEncoder !== 'undefined';
  }

  /**
   * Encode a video frame
   */
  async encodeFrame(frame: VideoFrame, timestamp: number): Promise<void> {
    if (!this.encoder || !this.isEncoding) {
      throw new Error('Encoder not initialized or not encoding');
    }

    try {
      await this.encoder.encode(frame);
      this.frameQueue.push({ frame, timestamp });
    } catch (error) {
      console.error('Failed to encode frame:', error);
      throw error;
    }
  }

  /**
   * Start encoding
   */
  async startEncoding(): Promise<void> {
    if (!this.encoder) {
      throw new Error('Encoder not initialized');
    }

    this.isEncoding = true;
    this.encodedChunks = [];
    this.frameQueue = [];

    console.log('Video encoding started');
  }

  /**
   * Stop encoding and flush remaining frames
   */
  async stopEncoding(): Promise<EncodedVideoChunk[]> {
    if (!this.encoder) {
      throw new Error('Encoder not initialized');
    }

    this.isEncoding = false;

    try {
      await this.encoder.flush();
      console.log('Video encoding completed');
      return [...this.encodedChunks];
    } catch (error) {
      console.error('Failed to flush encoder:', error);
      throw error;
    }
  }

  /**
   * Handle encoded video chunks
   */
  private handleEncodedChunk(chunk: EncodedVideoChunk): void {
    this.encodedChunks.push(chunk);
    console.log(
      `Encoded chunk: ${chunk.type}, timestamp: ${chunk.timestamp}, duration: ${chunk.duration}`
    );
  }

  /**
   * Handle encoder errors
   */
  private handleEncoderError(error: Error): void {
    console.error('VideoEncoder error:', error);
    this.isEncoding = false;
  }

  /**
   * Get the best supported configuration for the current browser
   */
  static async getBestSupportedConfig(): Promise<VideoEncoderConfig> {
    // Try main profile first
    try {
      const isMainSupported = await VideoEncoder.isConfigSupported({
        codec: VideoEncoderService.MAIN_PROFILE_CONFIG.codec,
        width: VideoEncoderService.MAIN_PROFILE_CONFIG.width,
        height: VideoEncoderService.MAIN_PROFILE_CONFIG.height,
        bitrate: VideoEncoderService.MAIN_PROFILE_CONFIG.bitrate,
        framerate: VideoEncoderService.MAIN_PROFILE_CONFIG.fps,
      });

      if (isMainSupported.supported) {
        return VideoEncoderService.MAIN_PROFILE_CONFIG;
      }
    } catch (error) {
      console.warn('Main profile not supported, falling back to baseline');
    }

    // Fall back to baseline profile
    return VideoEncoderService.DEFAULT_CONFIG;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.encoder) {
      this.encoder.close();
      this.encoder = null;
    }
    this.isEncoding = false;
    this.frameQueue = [];
    this.encodedChunks = [];
  }
}
