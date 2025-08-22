export interface WebCodecsSupport {
  videoEncoder: boolean;
  audioEncoder: boolean;
  videoDecoder: boolean;
  audioDecoder: boolean;
}

export class WebCodecsService {
  /**
   * Check if WebCodecs API is supported in the current browser
   */
  static checkSupport(): WebCodecsSupport {
    return {
      videoEncoder: typeof VideoEncoder !== 'undefined',
      audioEncoder: typeof AudioEncoder !== 'undefined',
      videoDecoder: typeof VideoDecoder !== 'undefined',
      audioDecoder: typeof AudioDecoder !== 'undefined',
    };
  }

  /**
   * Check if WebCodecs is fully supported for encoding
   */
  static isEncodingSupported(): boolean {
    const support = this.checkSupport();
    return support.videoEncoder && support.audioEncoder;
  }

  /**
   * Get a human-readable description of WebCodecs support
   */
  static getSupportDescription(): string {
    const support = this.checkSupport();

    if (support.videoEncoder && support.audioEncoder) {
      return 'WebCodecs fully supported - Fast encoding available';
    } else if (support.videoEncoder || support.audioEncoder) {
      return 'WebCodecs partially supported - Some features may be limited';
    } else {
      return 'WebCodecs not supported - Will use fallback encoding';
    }
  }

  /**
   * Check if the current browser supports H.264 encoding
   */
  static async checkH264Support(): Promise<boolean> {
    if (!this.checkSupport().videoEncoder) {
      return false;
    }

    try {
      const configs = await VideoEncoder.isConfigSupported({
        codec: 'avc1.42E01E', // H.264 baseline profile
        width: 1920,
        height: 1080,
        bitrate: 6000000, // 6 Mbps
        framerate: 30,
      });
      return configs.supported ?? false;
    } catch (error) {
      console.warn('H.264 support check failed:', error);
      return false;
    }
  }

  /**
   * Check if the current browser supports AAC encoding
   */
  static async checkAACSupport(): Promise<boolean> {
    if (!this.checkSupport().audioEncoder) {
      return false;
    }

    try {
      const configs = await AudioEncoder.isConfigSupported({
        codec: 'mp4a.40.2', // AAC-LC
        sampleRate: 44100,
        numberOfChannels: 2,
        bitrate: 128000, // 128 kbps
      });
      return configs.supported ?? false;
    } catch (error) {
      console.warn('AAC support check failed:', error);
      return false;
    }
  }
}
