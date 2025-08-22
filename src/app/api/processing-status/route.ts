import { NextRequest, NextResponse } from 'next/server';

interface ProcessingJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  currentStep: string;
  startTime: Date;
  estimatedTimeRemaining?: number;
  error?: string;
  result?: {
    videoUrl?: string;
    thumbnailUrl?: string;
    duration: number;
    fileSize: number;
  };
}

interface CreateJobData {
  videoUrl?: string;
  options?: Record<string, unknown>;
}

interface UpdateJobData {
  status?: ProcessingJob['status'];
  progress?: number;
  currentStep?: string;
  error?: string;
  result?: ProcessingJob['result'];
}

// In-memory storage for processing status (in production, use Redis or database)
const processingJobs = new Map<string, ProcessingJob>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    const job = processingJobs.get(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job.id,
        status: job.status,
        progress: job.progress,
        currentStep: job.currentStep,
        startTime: job.startTime,
        estimatedTimeRemaining: job.estimatedTimeRemaining,
        error: job.error,
        result: job.result,
      },
    });
  } catch (error) {
    console.error('Error fetching processing status:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch processing status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, jobId, ...data } = body;

    switch (action) {
      case 'create':
        return await createJob(data as CreateJobData);
      case 'update':
        return await updateJob(jobId, data as UpdateJobData);
      case 'cancel':
        return await cancelJob(jobId);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in processing status API:', error);
    return NextResponse.json(
      {
        error: 'Processing status operation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function createJob(data: CreateJobData) {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const job: ProcessingJob = {
    id: jobId,
    status: 'pending',
    progress: 0,
    currentStep: 'Initializing video processing...',
    startTime: new Date(),
    estimatedTimeRemaining: undefined,
    error: undefined,
    result: undefined,
  };

  processingJobs.set(jobId, job);

  return NextResponse.json({
    success: true,
    jobId,
    message: 'Processing job created successfully',
    job,
  });
}

async function updateJob(jobId: string, data: UpdateJobData) {
  const job = processingJobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  // Update job with new data
  Object.assign(job, data);

  // Update timestamp for progress updates
  if (data.progress !== undefined) {
    job.progress = Math.max(0, Math.min(100, data.progress));
  }

  // Calculate estimated time remaining based on progress
  if (data.progress !== undefined && data.progress > 0) {
    const elapsed = Date.now() - job.startTime.getTime();
    const estimatedTotal = (elapsed / data.progress) * 100;
    job.estimatedTimeRemaining = Math.max(0, estimatedTotal - elapsed);
  }

  return NextResponse.json({
    success: true,
    message: 'Job updated successfully',
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      currentStep: job.currentStep,
      estimatedTimeRemaining: job.estimatedTimeRemaining,
    },
  });
}

async function cancelJob(jobId: string) {
  const job = processingJobs.get(jobId);
  if (!job) {
    return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  }

  if (job.status === 'completed' || job.status === 'failed') {
    return NextResponse.json(
      { error: 'Cannot cancel completed or failed job' },
      { status: 400 }
    );
  }

  job.status = 'failed';
  job.error = 'Job cancelled by user';
  job.currentStep = 'Cancelled';

  return NextResponse.json({
    success: true,
    message: 'Job cancelled successfully',
    job: {
      id: job.id,
      status: job.status,
      error: job.error,
    },
  });
}

// Cleanup old completed/failed jobs periodically
setInterval(
  () => {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [jobId, job] of processingJobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        const age = now - job.startTime.getTime();
        if (age > maxAge) {
          processingJobs.delete(jobId);
        }
      }
    }
  },
  60 * 60 * 1000
); // Clean up every hour
