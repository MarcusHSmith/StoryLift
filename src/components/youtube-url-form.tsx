'use client';

import { useState } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Youtube, Loader2, AlertCircle } from 'lucide-react';

// YouTube URL validation schema
const youtubeUrlSchema = z.object({
  url: z
    .string()
    .min(1, 'Please enter a YouTube URL')
    .url('Please enter a valid URL')
    .refine((url) => {
      // Common YouTube URL patterns
      const patterns = [
        /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
        /^(https?:\/\/)?(www\.)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
        /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        /^(https?:\/\/)?(www\.)?youtube\.com\/v\/([a-zA-Z0-9_-]{11})/,
      ];
      return patterns.some((pattern) => pattern.test(url));
    }, 'Please enter a valid YouTube URL'),
});

interface YouTubeUrlFormProps {
  onSubmit: (data: { url: string; videoId: string }) => void;
  isLoading?: boolean;
}

export function YouTubeUrlForm({
  onSubmit,
  isLoading = false,
}: YouTubeUrlFormProps) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const validatedData = youtubeUrlSchema.parse({ url });
      const videoId = extractVideoId(validatedData.url);

      if (!videoId) {
        setError('Could not extract video ID from URL');
        return;
      }

      onSubmit({ url: validatedData.url, videoId });
    } catch (err) {
      if (err instanceof z.ZodError) {
        setError(err.issues[0].message);
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-600" />
          YouTube URL
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isLoading}
              className="text-base"
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
          <Button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Extract Video Info'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
