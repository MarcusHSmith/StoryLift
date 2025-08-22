'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Upload, Video, AlertCircle, CheckCircle } from 'lucide-react';
import { useProjectStore } from '@/lib/store';
import { VideoService } from '@/lib/video-service';

export function VideoUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const {
    videoFile,
    videoDetails,
    isProcessingVideo,
    videoProcessingError,
    setVideoFile,
    setVideoDetails,
    setProcessingVideo,
    setVideoProcessingError,
  } = useProjectStore();

  const handleFileSelect = async (file: File) => {
    if (!VideoService.isSupportedVideoFormat(file)) {
      setVideoProcessingError(
        'Unsupported video format. Please use MP4, WebM, MOV, or AVI.'
      );
      return;
    }

    try {
      setProcessingVideo(true);
      setVideoProcessingError(null);

      // Create video file object
      const videoFileObj = VideoService.createVideoFile(file);
      setVideoFile(videoFileObj);

      // Analyze video to get details
      const details = await VideoService.analyzeVideo(file);
      setVideoDetails(details);
    } catch (error) {
      setVideoProcessingError(
        error instanceof Error ? error.message : 'Failed to process video file'
      );
    } finally {
      setProcessingVideo(false);
    }
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoDetails(null);
    setVideoProcessingError(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Video className="h-5 w-5" />
          Video Upload
        </CardTitle>
        <CardDescription>
          Upload a video file to process for Instagram Stories format
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!videoFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium mb-2">
              Drop your video file here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click to browse files
            </p>
            <Button onClick={handleClick} disabled={isProcessingVideo}>
              {isProcessingVideo ? 'Processing...' : 'Select Video File'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <p className="text-xs text-gray-400 mt-4">
              Supported formats: MP4, WebM, MOV, AVI, MKV
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Video className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium">{videoFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={removeVideo}>
                Remove
              </Button>
            </div>

            {videoDetails && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Resolution
                  </p>
                  <p className="text-lg">
                    {videoDetails.resolution.width} ×{' '}
                    {videoDetails.resolution.height}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Duration
                  </p>
                  <p className="text-lg">
                    {Math.round(videoDetails.duration)}s
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    FPS
                  </p>
                  <p className="text-lg">{videoDetails.fps}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Codec
                  </p>
                  <p className="text-lg">{videoDetails.codec}</p>
                </div>
              </div>
            )}

            {videoProcessingError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  {videoProcessingError}
                </p>
              </div>
            )}

            {videoDetails && !videoProcessingError && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Video ready for processing
                  </p>
                </div>

                <Button
                  onClick={async () => {
                    if (!videoFile) return;

                    try {
                      setProcessingVideo(true);
                      setVideoProcessingError(null);

                      await VideoService.processForInstagramStories(
                        videoFile.file,
                        (progress) => {
                          console.log(`Processing progress: ${progress}%`);
                        }
                      );

                      // Show success message
                      setVideoProcessingError(
                        'Video processed successfully! Ready for export.'
                      );
                    } catch (error) {
                      setVideoProcessingError(
                        error instanceof Error
                          ? error.message
                          : 'Failed to process video'
                      );
                    } finally {
                      setProcessingVideo(false);
                    }
                  }}
                  disabled={isProcessingVideo}
                  className="w-full"
                >
                  {isProcessingVideo
                    ? 'Processing...'
                    : 'Process for Instagram Stories'}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
