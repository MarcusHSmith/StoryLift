'use client';

import { useState } from 'react';
import { PreviewFrame } from '@/components/ui/preview-frame';
import { YouTubeUrlForm } from '@/components/youtube-url-form';
import { YouTubeMetadataPreview } from '@/components/youtube-metadata-preview';
import { YouTubeService } from '@/lib/youtube-service';
import { useProjectStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ArrowRight, Upload } from 'lucide-react';

export default function Home() {
  const {
    metadata,
    setYouTubeUrl,
    setVideoId,
    setMetadata,
    setLoading,
    setError,
    isLoading,
  } = useProjectStore();

  const [showMetadata, setShowMetadata] = useState(false);

  const handleYouTubeSubmit = async (data: {
    url: string;
    videoId: string;
  }) => {
    setYouTubeUrl(data.url);
    setVideoId(data.videoId);
    setLoading(true);
    setError(null);

    try {
      const videoMetadata = await YouTubeService.getMetadata(data.videoId);

      if (videoMetadata.error) {
        setError(videoMetadata.error);
        setShowMetadata(false);
      } else {
        setMetadata(videoMetadata);
        setShowMetadata(true);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch video metadata'
      );
      setShowMetadata(false);
    } finally {
      setLoading(false);
    }
  };

  const handleContinueToEditor = () => {
    // Navigate to editor page (will be implemented in future milestones)
    console.log('Continue to editor with metadata:', metadata);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">StoryLift</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Transform your videos into Instagram Stories with professional
            editing tools
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start max-w-6xl mx-auto">
          {/* Left side - Preview frame */}
          <div className="flex justify-center">
            <PreviewFrame showSafeZones={true} className="w-full max-w-sm">
              {metadata && showMetadata ? (
                <div className="flex flex-col items-center justify-center h-full text-white/90 p-4 text-center">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mb-3">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold mb-1">Video Ready!</h3>
                  <p className="text-xs text-white/70 line-clamp-2">
                    {metadata.title}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-white/70 p-8 text-center">
                  <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-4">
                    <svg
                      className="w-8 h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    Your Story Preview
                  </h3>
                  <p className="text-sm text-white/60">
                    Paste a YouTube URL to see it transformed into the perfect
                    Instagram Story format
                  </p>
                </div>
              )}
            </PreviewFrame>
          </div>

          {/* Right side - Input area */}
          <div className="space-y-6">
            {/* YouTube URL Form */}
            <YouTubeUrlForm
              onSubmit={handleYouTubeSubmit}
              isLoading={isLoading}
            />

            {/* Metadata Preview */}
            {metadata && showMetadata && (
              <div className="space-y-4">
                <YouTubeMetadataPreview metadata={metadata} />

                {/* Continue Button */}
                <Button
                  onClick={handleContinueToEditor}
                  className="w-full"
                  size="lg"
                >
                  Continue to Editor
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* File Upload Placeholder */}
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Video File
              </h3>
              <p className="text-muted-foreground mb-4">
                Or upload a video file directly (coming in Milestone 3)
              </p>
              <div className="p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  File upload coming in Milestone 3...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
