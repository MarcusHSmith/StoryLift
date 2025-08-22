export interface AudioEncoderConfig {
  sampleRate: number;
  numberOfChannels: number;
  bitrate: number;
  codec: string;
}

export interface AudioData {
  data: Float32Array[];
  timestamp: number;
  duration: number;
}

export class AudioEncoderService {
  private encoder: AudioEncoder | null = null;
  private isEncoding = false;
  private encodedChunks: EncodedAudioChunk[] = [];

  /**
   * Default configuration for Instagram Stories
   */
  static readonly DEFAULT_CONFIG: AudioEncoderConfig = {
    sampleRate: 44100,
    numberOfChannels: 2,
    bitrate: 128000, // 128 kbps
    codec: 'mp4a.40.2', // AAC-LC
  };

  /**
   * Check if AudioEncoder is supported
   */
  isSupported(): boolean {
    return typeof AudioEncoder !== 'undefined';
  }

  /**
   * Check if AAC encoding is supported
   */
  async checkAACSupport(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const configs = await AudioEncoder.isConfigSupported({
        codec: AudioEncoderService.DEFAULT_CONFIG.codec,
        sampleRate: AudioEncoderService.DEFAULT_CONFIG.sampleRate,
        numberOfChannels: AudioEncoderService.DEFAULT_CONFIG.numberOfChannels,
        bitrate: AudioEncoderService.DEFAULT_CONFIG.bitrate,
      });
      return configs.supported ?? false;
    } catch (error) {
      console.warn('AAC support check failed:', error);
      return false;
    }
  }

  /**
   * Initialize the audio encoder
   */
  async initialize(
    config: AudioEncoderConfig = AudioEncoderService.DEFAULT_CONFIG
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('AudioEncoder is not supported in this browser');
    }

    // Check if the configuration is supported
    const isSupported = await AudioEncoder.isConfigSupported({
      codec: config.codec,
      sampleRate: config.sampleRate,
      numberOfChannels: config.numberOfChannels,
      bitrate: config.bitrate,
    });

    if (!isSupported.supported) {
      throw new Error(
        `AudioEncoder configuration not supported: ${config.codec}`
      );
    }

    // Create the encoder
    this.encoder = new AudioEncoder({
      output: this.handleEncodedChunk.bind(this),
      error: this.handleEncoderError.bind(this),
    });

    // Configure the encoder
    await this.encoder.configure({
      codec: config.codec,
      sampleRate: config.sampleRate,
      numberOfChannels: config.numberOfChannels,
      bitrate: config.bitrate,
    });

    console.log(
      `AudioEncoder initialized: ${config.sampleRate}Hz, ${config.numberOfChannels}ch, ${config.bitrate}bps`
    );
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

    console.log('Audio encoding started');
  }

  /**
   * Encode audio data
   */
  async encodeAudio(audioData: AudioData): Promise<void> {
    if (!this.encoder || !this.isEncoding) {
      throw new Error('Encoder not initialized or not encoding');
    }

    try {
      // Convert Float32Array array to a single interleaved buffer
      const totalSamples = audioData.data[0].length * audioData.data.length;
      const interleavedData = new Float32Array(totalSamples);

      for (let frame = 0; frame < audioData.data[0].length; frame++) {
        for (let channel = 0; channel < audioData.data.length; channel++) {
          interleavedData[frame * audioData.data.length + channel] =
            audioData.data[channel][frame];
        }
      }

      const audioDataObj = new AudioData({
        format: 'f32-planar',
        sampleRate: AudioEncoderService.DEFAULT_CONFIG.sampleRate,
        numberOfFrames: audioData.data[0].length,
        numberOfChannels: audioData.data.length,
        timestamp: audioData.timestamp,
        data: interleavedData,
      });

      await this.encoder.encode(audioDataObj);
      audioDataObj.close();
    } catch (error) {
      console.error('Failed to encode audio:', error);
      throw error;
    }
  }

  /**
   * Stop encoding and flush remaining data
   */
  async stopEncoding(): Promise<EncodedAudioChunk[]> {
    if (!this.encoder) {
      throw new Error('Encoder not initialized');
    }

    this.isEncoding = false;

    try {
      await this.encoder.flush();
      console.log('Audio encoding completed');
      return [...this.encodedChunks];
    } catch (error) {
      console.error('Failed to flush audio encoder:', error);
      throw error;
    }
  }

  /**
   * Handle encoded audio chunks
   */
  private handleEncodedChunk(chunk: EncodedAudioChunk): void {
    this.encodedChunks.push(chunk);
    console.log(
      `Encoded audio chunk: ${chunk.type}, timestamp: ${chunk.timestamp}, duration: ${chunk.duration}`
    );
  }

  /**
   * Handle encoder errors
   */
  private handleEncoderError(error: Error): void {
    console.error('AudioEncoder error:', error);
    this.isEncoding = false;
  }

  /**
   * Extract audio from video element
   */
  static async extractAudioFromVideo(
    videoElement: HTMLVideoElement
  ): Promise<AudioData[]> {
    try {
      // Create an audio context to process the video's audio
      const audioContext = new AudioContext();
      const source = audioContext.createMediaElementSource(videoElement);

      // Create a script processor to capture audio data
      const processor = audioContext.createScriptProcessor(4096, 2, 2);

      const audioChunks: AudioData[] = [];
      let frameCount = 0;
      const sampleRate = audioContext.sampleRate;

      processor.onaudioprocess = (event) => {
        const inputBuffer = event.inputBuffer;
        const numberOfChannels = inputBuffer.numberOfChannels;
        const numberOfFrames = inputBuffer.length;

        // Convert to Float32Array format
        const channelData: Float32Array[] = [];
        for (let channel = 0; channel < numberOfChannels; channel++) {
          channelData.push(inputBuffer.getChannelData(channel));
        }

        audioChunks.push({
          data: channelData,
          timestamp: frameCount * (numberOfFrames / sampleRate),
          duration: numberOfFrames / sampleRate,
        });

        frameCount++;
      };

      // Connect the audio graph
      source.connect(processor);
      processor.connect(audioContext.destination);

      // Play the video to start audio processing
      await videoElement.play();

      // Wait for the video to finish or be stopped
      return new Promise((resolve) => {
        const checkEnd = () => {
          if (videoElement.ended || videoElement.paused) {
            processor.disconnect();
            source.disconnect();
            resolve(audioChunks);
          } else {
            setTimeout(checkEnd, 100);
          }
        };
        checkEnd();
      });
    } catch (error) {
      console.error('Failed to extract audio from video:', error);
      throw error;
    }
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
    this.encodedChunks = [];
  }
}
