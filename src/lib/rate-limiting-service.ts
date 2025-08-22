/**
 * Service for rate limiting and abuse prevention in video processing
 */
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
  blockDuration: number; // milliseconds
  userIdentifier: string; // IP, user ID, or session ID
}

export interface RateLimitInfo {
  remaining: number;
  resetTime: Date;
  isBlocked: boolean;
  blockExpiry?: Date;
}

export interface AbusePreventionConfig {
  maxFileSize: number; // bytes
  maxDuration: number; // seconds
  allowedFormats: string[];
  maxConcurrentJobs: number;
  suspiciousPatterns: RegExp[];
}

export class RateLimitingService {
  private static instance: RateLimitingService;
  private requestCounts: Map<
    string,
    { count: number; resetTime: Date; blockedUntil?: Date }
  > = new Map();
  private userJobs: Map<string, Set<string>> = new Map(); // user -> set of active job IDs
  private readonly DEFAULT_RATE_LIMIT = {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    blockDuration: 5 * 60 * 1000, // 5 minutes
  };

  private readonly DEFAULT_ABUSE_PREVENTION = {
    maxFileSize: 500 * 1024 * 1024, // 500 MB
    maxDuration: 600, // 10 minutes
    allowedFormats: ['mp4', 'avi', 'mov', 'mkv', 'webm'],
    maxConcurrentJobs: 3,
    suspiciousPatterns: [/\.exe$/i, /\.bat$/i, /\.cmd$/i, /\.ps1$/i, /\.sh$/i],
  };

  private constructor() {
    // Clean up expired rate limit entries every minute
    setInterval(() => this.cleanupExpiredEntries(), 60 * 1000);
  }

  static getInstance(): RateLimitingService {
    if (!RateLimitingService.instance) {
      RateLimitingService.instance = new RateLimitingService();
    }
    return RateLimitingService.instance;
  }

  /**
   * Check if a request is allowed based on rate limiting
   */
  isRequestAllowed(
    userIdentifier: string,
    config?: Partial<RateLimitConfig>
  ): { allowed: boolean; info: RateLimitInfo } {
    const fullConfig = { ...this.DEFAULT_RATE_LIMIT, ...config };
    const key = `rate_limit:${userIdentifier}`;
    const now = new Date();

    let entry = this.requestCounts.get(key);
    if (!entry) {
      entry = {
        count: 0,
        resetTime: new Date(now.getTime() + fullConfig.windowMs),
      };
      this.requestCounts.set(key, entry);
    }

    // Check if user is blocked
    if (entry.blockedUntil && now < entry.blockedUntil) {
      return {
        allowed: false,
        info: {
          remaining: 0,
          resetTime: entry.blockedUntil,
          isBlocked: true,
          blockExpiry: entry.blockedUntil,
        },
      };
    }

    // Check if window has reset
    if (now >= entry.resetTime) {
      entry.count = 0;
      entry.resetTime = new Date(now.getTime() + fullConfig.windowMs);
      entry.blockedUntil = undefined;
    }

    // Check if limit exceeded
    if (entry.count >= fullConfig.maxRequests) {
      // Block user for the specified duration
      entry.blockedUntil = new Date(now.getTime() + fullConfig.blockDuration);

      return {
        allowed: false,
        info: {
          remaining: 0,
          resetTime: entry.blockedUntil,
          isBlocked: true,
          blockExpiry: entry.blockedUntil,
        },
      };
    }

    // Increment request count
    entry.count++;

    return {
      allowed: true,
      info: {
        remaining: Math.max(0, fullConfig.maxRequests - entry.count),
        resetTime: entry.resetTime,
        isBlocked: false,
      },
    };
  }

  /**
   * Check if a video processing request is allowed based on abuse prevention
   */
  isVideoProcessingAllowed(
    userIdentifier: string,
    videoInfo: {
      fileSize: number;
      duration: number;
      format: string;
      filename: string;
    },
    config?: Partial<AbusePreventionConfig>
  ): { allowed: boolean; reason?: string } {
    const fullConfig = { ...this.DEFAULT_ABUSE_PREVENTION, ...config };

    // Check file size
    if (videoInfo.fileSize > fullConfig.maxFileSize) {
      return {
        allowed: false,
        reason: `File size (${this.formatBytes(videoInfo.fileSize)}) exceeds maximum allowed size (${this.formatBytes(fullConfig.maxFileSize)})`,
      };
    }

    // Check duration
    if (videoInfo.duration > fullConfig.maxDuration) {
      return {
        allowed: false,
        reason: `Video duration (${videoInfo.duration}s) exceeds maximum allowed duration (${fullConfig.maxDuration}s)`,
      };
    }

    // Check format
    if (!fullConfig.allowedFormats.includes(videoInfo.format.toLowerCase())) {
      return {
        allowed: false,
        reason: `Video format '${videoInfo.format}' is not supported. Allowed formats: ${fullConfig.allowedFormats.join(', ')}`,
      };
    }

    // Check for suspicious patterns
    for (const pattern of fullConfig.suspiciousPatterns) {
      if (pattern.test(videoInfo.filename)) {
        return {
          allowed: false,
          reason:
            'File appears to be suspicious and has been blocked for security reasons',
        };
      }
    }

    // Check concurrent jobs limit
    const userActiveJobs = this.userJobs.get(userIdentifier) || new Set();
    if (userActiveJobs.size >= fullConfig.maxConcurrentJobs) {
      return {
        allowed: false,
        reason: `Maximum concurrent jobs (${fullConfig.maxConcurrentJobs}) exceeded. Please wait for current jobs to complete.`,
      };
    }

    return { allowed: true };
  }

  /**
   * Register a new processing job for a user
   */
  registerJob(userIdentifier: string, jobId: string): void {
    if (!this.userJobs.has(userIdentifier)) {
      this.userJobs.set(userIdentifier, new Set());
    }
    this.userJobs.get(userIdentifier)!.add(jobId);
  }

  /**
   * Unregister a completed job for a user
   */
  unregisterJob(userIdentifier: string, jobId: string): void {
    const userJobs = this.userJobs.get(userIdentifier);
    if (userJobs) {
      userJobs.delete(jobId);
      if (userJobs.size === 0) {
        this.userJobs.delete(userIdentifier);
      }
    }
  }

  /**
   * Get rate limit information for a user
   */
  getRateLimitInfo(userIdentifier: string): RateLimitInfo | null {
    const key = `rate_limit:${userIdentifier}`;
    const entry = this.requestCounts.get(key);

    if (!entry) {
      return null;
    }

    const now = new Date();
    const isBlocked = entry.blockedUntil ? now < entry.blockedUntil : false;

    return {
      remaining: Math.max(0, this.DEFAULT_RATE_LIMIT.maxRequests - entry.count),
      resetTime: entry.resetTime,
      isBlocked,
      blockExpiry: entry.blockedUntil,
    };
  }

  /**
   * Get abuse prevention statistics
   */
  getAbusePreventionStats(): {
    totalUsers: number;
    totalActiveJobs: number;
    blockedUsers: number;
    rateLimitEntries: number;
  } {
    let totalActiveJobs = 0;
    let blockedUsers = 0;
    const now = new Date();

    for (const [user, jobs] of this.userJobs.entries()) {
      totalActiveJobs += jobs.size;
    }

    for (const entry of this.requestCounts.values()) {
      if (entry.blockedUntil && now < entry.blockedUntil) {
        blockedUsers++;
      }
    }

    return {
      totalUsers: this.userJobs.size,
      totalActiveJobs,
      blockedUsers,
      rateLimitEntries: this.requestCounts.size,
    };
  }

  /**
   * Reset rate limiting for a specific user
   */
  resetUserRateLimit(userIdentifier: string): void {
    const key = `rate_limit:${userIdentifier}`;
    this.requestCounts.delete(key);
  }

  /**
   * Reset all rate limiting data
   */
  resetAllRateLimits(): void {
    this.requestCounts.clear();
    this.userJobs.clear();
  }

  /**
   * Clean up expired rate limit entries
   */
  private cleanupExpiredEntries(): void {
    const now = new Date();

    for (const [key, entry] of this.requestCounts.entries()) {
      const isExpired =
        now >= entry.resetTime &&
        (!entry.blockedUntil || now >= entry.blockedUntil);

      if (isExpired) {
        this.requestCounts.delete(key);
      }
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
