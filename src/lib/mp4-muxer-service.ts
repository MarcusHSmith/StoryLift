import { VideoEncoderConfig } from './video-encoder-service';
import { AudioEncoderConfig } from './audio-encoder-service';

export interface MP4MuxerConfig {
  video: VideoEncoderConfig;
  audio: AudioEncoderConfig;
  duration: number; // in seconds
}

export interface MuxedMP4Data {
  buffer: ArrayBuffer;
  size: number;
  duration: number;
  videoTracks: number;
  audioTracks: number;
}

export class MP4MuxerService {
  private mp4maker: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor() {
    // Dynamically import mp4maker to avoid SSR issues
    if (typeof window !== 'undefined') {
      this.loadMP4Maker();
    }
  }

  /**
   * Load the mp4maker library
   */
  private async loadMP4Maker(): Promise<void> {
    try {
      // Dynamic import for client-side only
      const mp4makerModule = await import('mp4maker');
      this.mp4maker = mp4makerModule.default || mp4makerModule;
      console.log('MP4 maker library loaded successfully');
    } catch (error) {
      console.error('Failed to load MP4 maker library:', error);
      throw new Error('MP4 maker library not available');
    }
  }

  /**
   * Mux encoded video and audio chunks into an MP4 container
   */
  async muxToMP4(
    videoChunks: EncodedVideoChunk[],
    audioChunks: EncodedAudioChunk[],
    config: MP4MuxerConfig
  ): Promise<MuxedMP4Data> {
    if (!this.mp4maker) {
      await this.loadMP4Maker();
    }

    try {
      console.log(
        `Starting MP4 muxing: ${videoChunks.length} video chunks, ${audioChunks.length} audio chunks`
      );

      // Create a new MP4 maker instance
      const mp4 = new this.mp4maker();

      // Add video track
      const videoTrack = mp4.addVideoTrack({
        width: config.video.width,
        height: config.video.height,
        timescale: 90000, // 90kHz timescale for H.264
        duration: config.duration * 90000, // Convert to timescale units
        codec: 'avc1',
        codecProfile: this.getH264ProfileString(config.video.codec),
        bitrate: config.video.bitrate,
        framerate: config.video.fps,
      });

      // Add audio track
      const audioTrack = mp4.addAudioTrack({
        sampleRate: config.audio.sampleRate,
        numberOfChannels: config.audio.numberOfChannels,
        timescale: config.audio.sampleRate,
        duration: config.duration * config.audio.sampleRate,
        codec: 'mp4a',
        bitrate: config.audio.bitrate,
      });

      // Add video chunks
      for (const chunk of videoChunks) {
        if (chunk.type === 'key' || chunk.type === 'delta') {
          const duration = chunk.duration || (1 / config.video.fps) * 90000; // Convert to timescale

          // Copy the chunk data to a new Uint8Array
          const chunkData = new Uint8Array(chunk.byteLength);
          chunk.copyTo(chunkData);

          videoTrack.addSample(chunkData, {
            duration: duration,
            cts: chunk.timestamp * 90000, // Convert to timescale
            is_sync: chunk.type === 'key',
          });
        }
      }

      // Add audio chunks
      for (const chunk of audioChunks) {
        if (chunk.type === 'key' || chunk.type === 'delta') {
          const duration =
            chunk.duration ||
            (1 / config.audio.sampleRate) * config.audio.sampleRate;

          // Copy the chunk data to a new Uint8Array
          const chunkData = new Uint8Array(chunk.byteLength);
          chunk.copyTo(chunkData);

          audioTrack.addSample(chunkData, {
            duration: duration,
            cts: chunk.timestamp * config.audio.sampleRate,
            is_sync: true, // Audio chunks are typically sync samples
          });
        }
      }

      // Finalize the MP4
      const mp4Buffer = mp4.end();

      console.log(`MP4 muxing completed: ${mp4Buffer.byteLength} bytes`);

      return {
        buffer: mp4Buffer,
        size: mp4Buffer.byteLength,
        duration: config.duration,
        videoTracks: 1,
        audioTracks: 1,
      };
    } catch (error) {
      console.error('MP4 muxing failed:', error);
      throw new Error(
        `Failed to create MP4: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert H.264 codec string to profile string for mp4maker
   */
  private getH264ProfileString(codec: string): string {
    if (codec.includes('64001E')) return 'high';
    if (codec.includes('4D401E')) return 'main';
    if (codec.includes('42E01E')) return 'baseline';
    return 'baseline'; // fallback
  }

  /**
   * Create a download link for the MP4 file
   */
  createDownloadLink(
    mp4Data: MuxedMP4Data,
    filename: string = 'story.mp4'
  ): string {
    const blob = new Blob([mp4Data.buffer], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);

    // Create download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return url;
  }

  /**
   * Get MP4 metadata for debugging
   */
  getMP4Metadata(mp4Data: MuxedMP4Data): {
    size: string;
    duration: string;
    bitrate: string;
    resolution: string;
  } {
    const sizeMB = (mp4Data.size / (1024 * 1024)).toFixed(2);
    const durationMin = Math.floor(mp4Data.duration / 60);
    const durationSec = Math.floor(mp4Data.duration % 60);
    const bitrateMbps = (
      (mp4Data.size * 8) /
      (mp4Data.duration * 1024 * 1024)
    ).toFixed(2);

    return {
      size: `${sizeMB} MB`,
      duration: `${durationMin}:${durationSec.toString().padStart(2, '0')}`,
      bitrate: `${bitrateMbps} Mbps`,
      resolution: '1080x1920', // Instagram Stories standard
    };
  }

  /**
   * Check if the service is ready
   */
  isReady(): boolean {
    return this.mp4maker !== undefined;
  }
}
