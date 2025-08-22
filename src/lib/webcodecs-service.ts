export interface WebCodecsSupport {
  videoEncoder: boolean;
  audioEncoder: boolean;
  videoDecoder: boolean;
  audioDecoder: boolean;
}

export interface CodecSupportDetails {
  h264: {
    baseline: boolean;
    main: boolean;
    high: boolean;
  };
  aac: {
    lc: boolean;
    he: boolean;
  };
  resolution: {
    '1080x1920': boolean;
    '720x1280': boolean;
  };
  framerate: {
    '30fps': boolean;
    '60fps': boolean;
  };
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
   * Check detailed codec support for Instagram Stories requirements
   */
  static async checkDetailedSupport(): Promise<CodecSupportDetails> {
    const support = this.checkSupport();

    if (!support.videoEncoder && !support.audioEncoder) {
      return {
        h264: { baseline: false, main: false, high: false },
        aac: { lc: false, he: false },
        resolution: { '1080x1920': false, '720x1280': false },
        framerate: { '30fps': false, '60fps': false },
      };
    }

    const details: CodecSupportDetails = {
      h264: { baseline: false, main: false, high: false },
      aac: { lc: false, he: false },
      resolution: { '1080x1920': false, '720x1280': false },
      framerate: { '30fps': false, '60fps': false },
    };

    // Check H.264 profiles if video encoder is supported
    if (support.videoEncoder) {
      try {
        // Check baseline profile
        const baselineConfig = await VideoEncoder.isConfigSupported({
          codec: 'avc1.42E01E', // H.264 baseline profile
          width: 1080,
          height: 1920,
          bitrate: 6000000, // 6 Mbps
          framerate: 30,
        });
        details.h264.baseline = baselineConfig.supported ?? false;

        // Check main profile
        const mainConfig = await VideoEncoder.isConfigSupported({
          codec: 'avc1.4D401E', // H.264 main profile
          width: 1080,
          height: 1920,
          bitrate: 6000000, // 6 Mbps
          framerate: 30,
        });
        details.h264.main = mainConfig.supported ?? false;

        // Check high profile
        const highConfig = await VideoEncoder.isConfigSupported({
          codec: 'avc1.64001E', // H.264 high profile
          width: 1080,
          height: 1920,
          bitrate: 6000000, // 6 Mbps
          framerate: 30,
        });
        details.h264.high = highConfig.supported ?? false;

        // Check resolution support
        const res1080p = await VideoEncoder.isConfigSupported({
          codec: 'avc1.42E01E',
          width: 1080,
          height: 1920,
          bitrate: 6000000,
          framerate: 30,
        });
        details.resolution['1080x1920'] = res1080p.supported ?? false;

        const res720p = await VideoEncoder.isConfigSupported({
          codec: 'avc1.42E01E',
          width: 720,
          height: 1280,
          bitrate: 3000000,
          framerate: 30,
        });
        details.resolution['720x1280'] = res720p.supported ?? false;

        // Check framerate support
        const fps30 = await VideoEncoder.isConfigSupported({
          codec: 'avc1.42E01E',
          width: 1080,
          height: 1920,
          bitrate: 6000000,
          framerate: 30,
        });
        details.framerate['30fps'] = fps30.supported ?? false;

        const fps60 = await VideoEncoder.isConfigSupported({
          codec: 'avc1.42E01E',
          width: 1080,
          height: 1920,
          bitrate: 6000000,
          framerate: 60,
        });
        details.framerate['60fps'] = fps60.supported ?? false;
      } catch (error) {
        console.warn('Video encoder support check failed:', error);
      }
    }

    // Check AAC support if audio encoder is supported
    if (support.audioEncoder) {
      try {
        // Check AAC-LC
        const aacLc = await AudioEncoder.isConfigSupported({
          codec: 'mp4a.40.2', // AAC-LC
          sampleRate: 44100,
          numberOfChannels: 2,
          bitrate: 128000, // 128 kbps
        });
        details.aac.lc = aacLc.supported ?? false;

        // Check AAC-HE
        const aacHe = await AudioEncoder.isConfigSupported({
          codec: 'mp4a.40.5', // AAC-HE
          sampleRate: 44100,
          numberOfChannels: 2,
          bitrate: 64000, // 64 kbps
        });
        details.aac.he = aacHe.supported ?? false;
      } catch (error) {
        console.warn('Audio encoder support check failed:', error);
      }
    }

    return details;
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

  /**
   * Get the best supported H.264 profile for Instagram Stories
   */
  static async getBestH264Profile(): Promise<string> {
    const details = await this.checkDetailedSupport();

    if (details.h264.high) return 'avc1.64001E'; // High profile
    if (details.h264.main) return 'avc1.4D401E'; // Main profile
    if (details.h264.baseline) return 'avc1.42E01E'; // Baseline profile

    throw new Error('No H.264 profile supported');
  }

  /**
   * Get the best supported resolution for Instagram Stories
   */
  static async getBestResolution(): Promise<{ width: number; height: number }> {
    const details = await this.checkDetailedSupport();

    if (details.resolution['1080x1920']) return { width: 1080, height: 1920 };
    if (details.resolution['720x1280']) return { width: 720, height: 1280 };

    throw new Error('No supported resolution found');
  }
}
