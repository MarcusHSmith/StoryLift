/**
 * Service for monitoring and logging video processing operations
 */
export interface ProcessingMetrics {
  jobId: string;
  userId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoInfo: {
    originalSize: number;
    originalDuration: number;
    originalFormat: string;
    targetFormat: string;
    targetResolution: string;
    targetFps: number;
  };
  performance: {
    framesProcessed: number;
    totalFrames: number;
    processingRate: number; // frames per second
    memoryUsage: number; // MB
    cpuUsage?: number; // percentage
  };
  errors?: string[];
  warnings?: string[];
}

export interface SystemMetrics {
  timestamp: Date;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  memoryUsage: number;
  errorRate: number;
  throughput: number; // jobs per minute
}

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error';
  category: 'processing' | 'system' | 'security' | 'performance';
  message: string;
  details?: Record<string, unknown>;
  jobId?: string;
  userId?: string;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private processingMetrics: Map<string, ProcessingMetrics> = new Map();
  private systemMetrics: SystemMetrics[] = [];
  private logEntries: LogEntry[] = [];
  private readonly MAX_METRICS_HISTORY = 1000;
  private readonly MAX_LOG_HISTORY = 5000;
  private readonly METRICS_INTERVAL = 30 * 1000; // 30 seconds

  private constructor() {
    this.startMetricsCollection();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  /**
   * Start monitoring a new processing job
   */
  startJobMonitoring(
    jobId: string,
    userId: string,
    videoInfo: ProcessingMetrics['videoInfo']
  ): void {
    const metrics: ProcessingMetrics = {
      jobId,
      userId,
      startTime: new Date(),
      status: 'pending',
      videoInfo,
      performance: {
        framesProcessed: 0,
        totalFrames: 0,
        processingRate: 0,
        memoryUsage: this.getCurrentMemoryUsage(),
      },
    };

    this.processingMetrics.set(jobId, metrics);
    this.log('info', 'processing', `Job started: ${jobId}`, { jobId, userId });
  }

  /**
   * Update job status
   */
  updateJobStatus(jobId: string, status: ProcessingMetrics['status']): void {
    const metrics = this.processingMetrics.get(jobId);
    if (!metrics) return;

    metrics.status = status;

    if (status === 'completed' || status === 'failed') {
      metrics.endTime = new Date();
      metrics.duration =
        metrics.endTime.getTime() - metrics.startTime.getTime();
    }

    this.log(
      'info',
      'processing',
      `Job status updated: ${jobId} -> ${status}`,
      { jobId, status }
    );
  }

  /**
   * Update processing performance metrics
   */
  updatePerformanceMetrics(
    jobId: string,
    performance: Partial<ProcessingMetrics['performance']>
  ): void {
    const metrics = this.processingMetrics.get(jobId);
    if (!metrics) return;

    Object.assign(metrics.performance, performance);

    // Calculate processing rate if we have frame data
    if (performance.framesProcessed && performance.totalFrames) {
      const elapsed = (Date.now() - metrics.startTime.getTime()) / 1000;
      metrics.performance.processingRate =
        performance.framesProcessed / elapsed;
    }
  }

  /**
   * Add error to job metrics
   */
  addJobError(jobId: string, error: string): void {
    const metrics = this.processingMetrics.get(jobId);
    if (!metrics) return;

    if (!metrics.errors) {
      metrics.errors = [];
    }
    metrics.errors.push(error);

    this.log('error', 'processing', `Job error: ${jobId}`, { jobId, error });
  }

  /**
   * Add warning to job metrics
   */
  addJobWarning(jobId: string, warning: string): void {
    const metrics = this.processingMetrics.get(jobId);
    if (!metrics) return;

    if (!metrics.warnings) {
      metrics.warnings = [];
    }
    metrics.warnings.push(warning);

    this.log('warn', 'processing', `Job warning: ${jobId}`, { jobId, warning });
  }

  /**
   * Get job metrics
   */
  getJobMetrics(jobId: string): ProcessingMetrics | undefined {
    return this.processingMetrics.get(jobId);
  }

  /**
   * Get all job metrics
   */
  getAllJobMetrics(): ProcessingMetrics[] {
    return Array.from(this.processingMetrics.values());
  }

  /**
   * Get system metrics
   */
  getSystemMetrics(): SystemMetrics[] {
    return [...this.systemMetrics];
  }

  /**
   * Get current system health
   */
  getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  } {
    const latestMetrics = this.systemMetrics[this.systemMetrics.length - 1];
    if (!latestMetrics) {
      return {
        status: 'healthy',
        issues: [],
        recommendations: [],
      };
    }

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check error rate
    if (latestMetrics.errorRate > 0.1) {
      // > 10%
      issues.push(
        `High error rate: ${(latestMetrics.errorRate * 100).toFixed(1)}%`
      );
      recommendations.push('Review recent error logs for patterns');
      recommendations.push('Check system resources and dependencies');
    }

    // Check memory usage
    if (latestMetrics.memoryUsage > 1000) {
      // > 1GB
      issues.push(`High memory usage: ${latestMetrics.memoryUsage}MB`);
      recommendations.push('Consider reducing concurrent job limits');
      recommendations.push('Monitor for memory leaks');
    }

    // Check throughput
    if (latestMetrics.throughput < 0.5) {
      // < 0.5 jobs per minute
      issues.push('Low processing throughput detected');
      recommendations.push('Check system performance');
      recommendations.push('Review processing pipeline efficiency');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (issues.length > 2) {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'warning';
    }

    return { status, issues, recommendations };
  }

  /**
   * Log an entry
   */
  log(
    level: LogEntry['level'],
    category: LogEntry['category'],
    message: string,
    details?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      category,
      message,
      details,
    };

    this.logEntries.push(entry);

    // Keep log size manageable
    if (this.logEntries.length > this.MAX_LOG_HISTORY) {
      this.logEntries = this.logEntries.slice(-this.MAX_LOG_HISTORY);
    }

    // Console logging for development
    const logMethod =
      level === 'error'
        ? 'error'
        : level === 'warn'
          ? 'warn'
          : level === 'debug'
            ? 'debug'
            : 'log';

    console[logMethod](`[${category.toUpperCase()}] ${message}`, details || '');
  }

  /**
   * Get log entries with filtering
   */
  getLogEntries(
    level?: LogEntry['level'],
    category?: LogEntry['category'],
    limit: number = 100
  ): LogEntry[] {
    let filtered = this.logEntries;

    if (level) {
      filtered = filtered.filter((entry) => entry.level === level);
    }

    if (category) {
      filtered = filtered.filter((entry) => entry.category === category);
    }

    return filtered.slice(-limit);
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): {
    jobs: ProcessingMetrics[];
    system: SystemMetrics[];
    logs: LogEntry[];
    exportTime: Date;
  } {
    return {
      jobs: Array.from(this.processingMetrics.values()),
      system: [...this.systemMetrics],
      logs: [...this.logEntries],
      exportTime: new Date(),
    };
  }

  /**
   * Clear old metrics and logs
   */
  cleanup(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    // Clean up old job metrics
    for (const [jobId, metrics] of this.processingMetrics.entries()) {
      if (metrics.startTime < cutoff) {
        this.processingMetrics.delete(jobId);
      }
    }

    // Clean up old system metrics
    this.systemMetrics = this.systemMetrics.filter(
      (metrics) => metrics.timestamp > cutoff
    );

    // Clean up old log entries
    this.logEntries = this.logEntries.filter(
      (entry) => entry.timestamp > cutoff
    );

    this.log('info', 'system', 'Cleanup completed', {
      remainingJobs: this.processingMetrics.size,
      remainingMetrics: this.systemMetrics.length,
      remainingLogs: this.logEntries.length,
    });
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.collectSystemMetrics();
    }, this.METRICS_INTERVAL);
  }

  /**
   * Collect current system metrics
   */
  private collectSystemMetrics(): void {
    const activeJobs = Array.from(this.processingMetrics.values()).filter(
      (metrics) => metrics.status === 'processing'
    ).length;

    const completedJobs = Array.from(this.processingMetrics.values()).filter(
      (metrics) => metrics.status === 'completed'
    ).length;

    const failedJobs = Array.from(this.processingMetrics.values()).filter(
      (metrics) => metrics.status === 'failed'
    ).length;

    const completedMetrics = Array.from(this.processingMetrics.values()).filter(
      (metrics) => metrics.duration !== undefined
    );

    const averageProcessingTime =
      completedMetrics.length > 0
        ? completedMetrics.reduce(
            (sum, metrics) => sum + (metrics.duration || 0),
            0
          ) / completedMetrics.length
        : 0;

    const totalJobs = completedJobs + failedJobs;
    const errorRate = totalJobs > 0 ? failedJobs / totalJobs : 0;

    // Calculate throughput (jobs per minute)
    const recentJobs = Array.from(this.processingMetrics.values()).filter(
      (metrics) =>
        metrics.endTime && metrics.endTime > new Date(Date.now() - 60 * 1000)
    ); // Last minute
    const throughput = recentJobs.length;

    const systemMetrics: SystemMetrics = {
      timestamp: new Date(),
      activeJobs,
      completedJobs,
      failedJobs,
      averageProcessingTime,
      memoryUsage: this.getCurrentMemoryUsage(),
      errorRate,
      throughput,
    };

    this.systemMetrics.push(systemMetrics);

    // Keep metrics history manageable
    if (this.systemMetrics.length > this.MAX_METRICS_HISTORY) {
      this.systemMetrics = this.systemMetrics.slice(-this.MAX_METRICS_HISTORY);
    }
  }

  /**
   * Get current memory usage (simplified)
   */
  private getCurrentMemoryUsage(): number {
    // In a browser environment, we can't get actual memory usage
    // This is a placeholder that would be replaced with real metrics
    // in a Node.js environment or using Performance API
    return Math.random() * 100 + 50; // Simulate 50-150 MB usage
  }
}
