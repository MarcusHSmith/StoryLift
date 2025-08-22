import { VideoDetails, VideoFile } from './store';

export class VideoService {
  /**
   * Analyze a video file to extract metadata like resolution, fps, duration, and codec
   */
  static async analyzeVideo(file: File): Promise<VideoDetails> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const url = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        try {
          // Try to get more accurate FPS by analyzing the file extension and type
          let estimatedFps = 30; // Default
          let estimatedCodec = 'unknown';

          // Estimate codec based on file type
          if (file.type === 'video/mp4') {
            estimatedCodec = 'H.264/AVC';
          } else if (file.type === 'video/webm') {
            estimatedCodec = 'VP8/VP9';
          } else if (file.type === 'video/ogg') {
            estimatedCodec = 'Theora';
          } else if (file.type === 'video/avi') {
            estimatedCodec = 'Various';
          } else if (file.type === 'video/mov') {
            estimatedCodec = 'H.264/ProRes';
          } else if (file.type === 'video/mkv') {
            estimatedCodec = 'Various';
          }

          // Estimate FPS based on file size and duration (rough heuristic)
          if (file.size > 0 && video.duration > 0) {
            const bytesPerSecond = file.size / video.duration;
            if (bytesPerSecond > 5000000) {
              // > 5MB/s
              estimatedFps = 60;
            } else if (bytesPerSecond > 2000000) {
              // > 2MB/s
              estimatedFps = 30;
            } else {
              estimatedFps = 24;
            }
          }

          const details: VideoDetails = {
            resolution: {
              width: video.videoWidth,
              height: video.videoHeight,
            },
            fps: estimatedFps,
            duration: video.duration,
            codec: estimatedCodec,
          };

          URL.revokeObjectURL(url);
          resolve(details);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load video file'));
      };

      video.src = url;
      video.load();
    });
  }

  /**
   * Process a video file for Instagram Stories format
   * This is a placeholder for the actual FFmpeg processing
   */
  static async processForInstagramStories(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<File> {
    // Simulate processing steps for now
    // This will be implemented with FFmpeg in the next milestone

    onProgress?.(10);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate processing

    onProgress?.(30);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate format conversion

    onProgress?.(60);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate optimization

    onProgress?.(90);
    await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate finalization

    onProgress?.(100);

    // For now, return the original file
    // In the next milestone, this will return a processed MP4 file
    return file;
  }

  /**
   * Validate if a file is a supported video format
   */
  static isSupportedVideoFormat(file: File): boolean {
    const supportedTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/avi',
      'video/mov',
      'video/mkv',
    ];

    return (
      supportedTypes.includes(file.type) ||
      !!file.name.toLowerCase().match(/\.(mp4|webm|ogg|avi|mov|mkv)$/)
    );
  }

  /**
   * Create a VideoFile object from a File
   */
  static createVideoFile(file: File): VideoFile {
    return {
      file,
      name: file.name,
      size: file.size,
      type: file.type,
    };
  }
}
