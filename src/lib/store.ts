import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { YouTubeMetadata } from './youtube-service';

export interface VideoFile {
  file: File;
  name: string;
  size: number;
  type: string;
}

export interface VideoDetails {
  resolution: { width: number; height: number };
  fps: number;
  duration: number;
  codec: string;
}

export interface ProjectState {
  // YouTube metadata
  youtubeUrl: string;
  videoId: string;
  metadata: YouTubeMetadata | null;

  // Channel info (user-provided)
  channelHandle: string;
  subscriberCount: string;

  // Video processing
  videoFile: VideoFile | null;
  videoDetails: VideoDetails | null;
  isProcessingVideo: boolean;
  videoProcessingError: string | null;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setYouTubeUrl: (url: string) => void;
  setVideoId: (id: string) => void;
  setMetadata: (metadata: YouTubeMetadata) => void;
  setChannelHandle: (handle: string) => void;
  setSubscriberCount: (count: string) => void;
  setVideoFile: (file: VideoFile | null) => void;
  setVideoDetails: (details: VideoDetails | null) => void;
  setProcessingVideo: (processing: boolean) => void;
  setVideoProcessingError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  youtubeUrl: '',
  videoId: '',
  metadata: null,
  channelHandle: '',
  subscriberCount: '',
  videoFile: null,
  videoDetails: null,
  isProcessingVideo: false,
  videoProcessingError: null,
  isLoading: false,
  error: null,
};

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      ...initialState,

      setYouTubeUrl: (url: string) => set({ youtubeUrl: url }),
      setVideoId: (id: string) => set({ videoId: id }),
      setMetadata: (metadata: YouTubeMetadata) => set({ metadata }),
      setChannelHandle: (handle: string) => set({ channelHandle: handle }),
      setSubscriberCount: (count: string) => set({ subscriberCount: count }),
      setVideoFile: (file: VideoFile | null) => set({ videoFile: file }),
      setVideoDetails: (details: VideoDetails | null) =>
        set({ videoDetails: details }),
      setProcessingVideo: (processing: boolean) =>
        set({ isProcessingVideo: processing }),
      setVideoProcessingError: (error: string | null) =>
        set({ videoProcessingError: error }),
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      reset: () => set(initialState),
    }),
    {
      name: 'storylift-project',
      // Don't persist binary data or large objects
      partialize: (state) => ({
        youtubeUrl: state.youtubeUrl,
        videoId: state.videoId,
        metadata: state.metadata,
        channelHandle: state.channelHandle,
        subscriberCount: state.subscriberCount,
        videoDetails: state.videoDetails,
      }),
    }
  )
);
