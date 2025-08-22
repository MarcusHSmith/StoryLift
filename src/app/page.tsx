import { PreviewFrame } from '@/components/ui/preview-frame';

export default function Home() {
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          {/* Left side - Preview frame */}
          <div className="flex justify-center">
            <PreviewFrame showSafeZones={true} className="w-full max-w-sm">
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
                  Upload a video to see it transformed into the perfect
                  Instagram Story format
                </p>
              </div>
            </PreviewFrame>
          </div>

          {/* Right side - Input area */}
          <div className="space-y-6">
            <div className="bg-card border rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">Get Started</h2>
              <p className="text-muted-foreground mb-6">
                Paste a YouTube URL or upload a video file to begin creating
                your Instagram Story
              </p>

              {/* Placeholder for YouTube URL input - will be implemented in Milestone 2 */}
              <div className="space-y-4">
                <div className="p-4 border-2 border-dashed border-muted-foreground/25 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    YouTube URL input coming in next milestone...
                  </p>
                </div>

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
    </div>
  );
}
