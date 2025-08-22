'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { YouTubeMetadata } from '@/lib/youtube-service';
import { useProjectStore } from '@/lib/store';
import { Youtube, User, Users } from 'lucide-react';

interface YouTubeMetadataPreviewProps {
  metadata: YouTubeMetadata;
}

export function YouTubeMetadataPreview({
  metadata,
}: YouTubeMetadataPreviewProps) {
  const {
    channelHandle,
    subscriberCount,
    setChannelHandle,
    setSubscriberCount,
  } = useProjectStore();

  if (metadata.error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <Youtube className="w-5 h-5" />
            <span className="font-medium">Error loading video metadata</span>
          </div>
          <p className="text-sm text-red-600 mt-2">{metadata.error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-600" />
          Video Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Thumbnail */}
        {metadata.thumbnail && (
          <div className="space-y-2">
            <Label>Thumbnail</Label>
            <div className="relative">
              <img
                src={metadata.thumbnail}
                alt="Video thumbnail"
                className="w-full h-32 object-cover rounded-lg border"
              />
            </div>
          </div>
        )}

        {/* Title */}
        <div className="space-y-2">
          <Label>Video Title</Label>
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm font-medium line-clamp-2">{metadata.title}</p>
          </div>
        </div>

        {/* Channel Info */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Channel Information
          </Label>

          <div className="space-y-3">
            {/* Channel Avatar and Name */}
            <div className="flex items-center gap-3">
              {metadata.channelAvatar ? (
                <img
                  src={metadata.channelAvatar}
                  alt="Channel avatar"
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium">{metadata.channelName}</p>
              </div>
            </div>

            {/* Channel Handle Input */}
            <div className="space-y-2">
              <Label htmlFor="channel-handle">
                Channel Handle (e.g., @username)
              </Label>
              <Input
                id="channel-handle"
                placeholder="@username"
                value={channelHandle}
                onChange={(e) => setChannelHandle(e.target.value)}
              />
            </div>

            {/* Subscriber Count Input */}
            <div className="space-y-2">
              <Label
                htmlFor="subscriber-count"
                className="flex items-center gap-2"
              >
                <Users className="w-4 h-4" />
                Subscriber Count
              </Label>
              <Input
                id="subscriber-count"
                placeholder="1.2M subscribers"
                value={subscriberCount}
                onChange={(e) => setSubscriberCount(e.target.value)}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
