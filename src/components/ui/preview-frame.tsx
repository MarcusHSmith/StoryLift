import { cn } from '@/lib/utils';

interface PreviewFrameProps {
  children?: React.ReactNode;
  className?: string;
  showSafeZones?: boolean;
}

export function PreviewFrame({
  children,
  className,
  showSafeZones = false,
}: PreviewFrameProps) {
  return (
    <div className={cn('relative mx-auto', className)}>
      {/* 9:16 aspect ratio container */}
      <div className="relative w-full max-w-sm mx-auto">
        <div className="relative w-full" style={{ aspectRatio: '9/16' }}>
          {/* Background */}
          <div className="absolute inset-0 bg-black rounded-lg overflow-hidden">
            {/* Content area */}
            <div className="relative w-full h-full">
              {children || (
                <div className="flex items-center justify-center h-full text-white/50">
                  <p className="text-sm">Preview</p>
                </div>
              )}

              {/* Safe zone guides */}
              {showSafeZones && (
                <>
                  {/* Top safe area guide */}
                  <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-red-500/20 to-transparent pointer-events-none">
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500/50"></div>
                  </div>

                  {/* Bottom safe area guide */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-blue-500/20 to-transparent pointer-events-none">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500/50"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
