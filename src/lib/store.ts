import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { YouTubeMetadata } from './youtube-service';

export interface ProjectState {
  // YouTube metadata
  youtubeUrl: string;
  videoId: string;
  metadata: YouTubeMetadata | null;

  // Channel info (user-provided)
  channelHandle: string;
  subscriberCount: string;

  // UI state
  isLoading: boolean;
  error: string | null;

  // Actions
  setYouTubeUrl: (url: string) => void;
  setVideoId: (id: string) => void;
  setMetadata: (metadata: YouTubeMetadata) => void;
  setChannelHandle: (handle: string) => void;
  setSubscriberCount: (count: string) => void;
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
      }),
    }
  )
);
