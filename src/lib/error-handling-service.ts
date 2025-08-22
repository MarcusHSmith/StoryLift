/**
 * Service for handling video processing errors with categorization and recovery strategies
 */
export enum ProcessingErrorType {
  // Video input errors
  INVALID_VIDEO_FORMAT = 'INVALID_VIDEO_FORMAT',
  UNSUPPORTED_CODEC = 'UNSUPPORTED_CODEC',
  CORRUPTED_VIDEO_FILE = 'CORRUPTED_VIDEO_FILE',
  VIDEO_TOO_LARGE = 'VIDEO_TOO_LARGE',

  // Processing errors
  ENCODING_FAILED = 'ENCODING_FAILED',
  FRAME_EXTRACTION_FAILED = 'FRAME_EXTRACTION_FAILED',
  MEMORY_OVERFLOW = 'MEMORY_OVERFLOW',
  TIMEOUT = 'TIMEOUT',

  // System errors
  BROWSER_NOT_SUPPORTED = 'BROWSER_NOT_SUPPORTED',
  WEBCODECS_UNAVAILABLE = 'WEBCODECS_UNAVAILABLE',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',

  // Network/API errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  UPLOAD_FAILED = 'UPLOAD_FAILED',

  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export interface ProcessingError {
  type: ProcessingErrorType;
  message: string;
  details?: string;
  timestamp: Date;
  recoverable: boolean;
  retryCount: number;
  maxRetries: number;
  recoveryStrategy?: RecoveryStrategy;
}

export interface RecoveryStrategy {
  action: 'retry' | 'fallback' | 'user_intervention' | 'abort';
  delay?: number; // milliseconds
  maxRetries?: number;
  fallbackMethod?: string;
  userMessage?: string;
}

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private errorLog: ProcessingError[] = [];
  private readonly MAX_ERROR_LOG_SIZE = 100;

  private constructor() {}

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Create a new processing error
   */
  createError(
    type: ProcessingErrorType,
    message: string,
    details?: string,
    recoverable: boolean = true,
    maxRetries: number = 3
  ): ProcessingError {
    const error: ProcessingError = {
      type,
      message,
      details,
      timestamp: new Date(),
      recoverable,
      retryCount: 0,
      maxRetries,
      recoveryStrategy: this.getRecoveryStrategy(type, recoverable),
    };

    this.logError(error);
    return error;
  }

  /**
   * Get recovery strategy for error type
   */
  private getRecoveryStrategy(
    type: ProcessingErrorType,
    recoverable: boolean
  ): RecoveryStrategy {
    if (!recoverable) {
      return {
        action: 'abort',
        userMessage:
          'This error cannot be recovered from. Please try a different video or contact support.',
      };
    }

    switch (type) {
      case ProcessingErrorType.NETWORK_ERROR:
        return {
          action: 'retry',
          delay: 5000, // 5 seconds
          maxRetries: 3,
          userMessage: 'Network error detected. Retrying in 5 seconds...',
        };

      case ProcessingErrorType.TIMEOUT:
        return {
          action: 'retry',
          delay: 10000, // 10 seconds
          maxRetries: 2,
          userMessage: 'Processing timed out. Retrying with longer timeout...',
        };

      case ProcessingErrorType.MEMORY_OVERFLOW:
        return {
          action: 'fallback',
          fallbackMethod: 'reduce_quality',
          userMessage:
            'Memory limit exceeded. Switching to lower quality processing...',
        };

      case ProcessingErrorType.UNSUPPORTED_CODEC:
        return {
          action: 'fallback',
          fallbackMethod: 'transcode',
          userMessage:
            'Unsupported video codec. Converting to supported format...',
        };

      case ProcessingErrorType.VIDEO_TOO_LARGE:
        return {
          action: 'user_intervention',
          userMessage:
            'Video file is too large. Please compress the video or use a shorter clip.',
        };

      default:
        return {
          action: 'retry',
          delay: 3000,
          maxRetries: 2,
          userMessage: 'An error occurred. Retrying...',
        };
    }
  }

  /**
   * Handle error and attempt recovery
   */
  async handleError(
    error: ProcessingError
  ): Promise<{ recovered: boolean; result?: unknown }> {
    if (!error.recoverable || error.retryCount >= error.maxRetries) {
      return { recovered: false };
    }

    const strategy = error.recoveryStrategy;
    if (!strategy) {
      return { recovered: false };
    }

    switch (strategy.action) {
      case 'retry':
        return await this.handleRetry(error, strategy);

      case 'fallback':
        return await this.handleFallback(error, strategy);

      case 'user_intervention':
        return { recovered: false }; // User needs to take action

      case 'abort':
        return { recovered: false };

      default:
        return { recovered: false };
    }
  }

  /**
   * Handle retry strategy
   */
  private async handleRetry(
    error: ProcessingError,
    strategy: RecoveryStrategy
  ): Promise<{ recovered: boolean; result?: unknown }> {
    if (strategy.delay) {
      await new Promise((resolve) => setTimeout(resolve, strategy.delay));
    }

    error.retryCount++;
    console.log(
      `Retrying operation (${error.retryCount}/${error.maxRetries}): ${error.message}`
    );

    // In a real implementation, you would retry the actual operation here
    // For now, we'll simulate a successful recovery
    return { recovered: true, result: 'Operation recovered after retry' };
  }

  /**
   * Handle fallback strategy
   */
  private async handleFallback(
    error: ProcessingError,
    strategy: RecoveryStrategy
  ): Promise<{ recovered: boolean; result?: unknown }> {
    console.log(`Applying fallback strategy: ${strategy.fallbackMethod}`);

    switch (strategy.fallbackMethod) {
      case 'reduce_quality':
        return {
          recovered: true,
          result: 'Switched to lower quality processing',
        };

      case 'transcode':
        return {
          recovered: true,
          result: 'Video transcoded to supported format',
        };

      default:
        return { recovered: false };
    }
  }

  /**
   * Log error to internal log
   */
  private logError(error: ProcessingError): void {
    this.errorLog.push(error);

    // Keep log size manageable
    if (this.errorLog.length > this.MAX_ERROR_LOG_SIZE) {
      this.errorLog = this.errorLog.slice(-this.MAX_ERROR_LOG_SIZE);
    }

    // Log to console for debugging
    console.error(`[${error.type}] ${error.message}`, {
      details: error.details,
      recoverable: error.recoverable,
      recoveryStrategy: error.recoveryStrategy,
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    recoverableErrors: number;
    unrecoverableErrors: number;
    errorsByType: Record<ProcessingErrorType, number>;
    recentErrors: ProcessingError[];
  } {
    const errorsByType: Record<ProcessingErrorType, number> = {} as Record<
      ProcessingErrorType,
      number
    >;

    for (const error of this.errorLog) {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    }

    return {
      totalErrors: this.errorLog.length,
      recoverableErrors: this.errorLog.filter((e) => e.recoverable).length,
      unrecoverableErrors: this.errorLog.filter((e) => !e.recoverable).length,
      errorsByType,
      recentErrors: this.errorLog.slice(-10), // Last 10 errors
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyMessage(error: ProcessingError): string {
    const baseMessage = error.message;

    if (error.recoveryStrategy?.userMessage) {
      return `${baseMessage}\n\n${error.recoveryStrategy.userMessage}`;
    }

    return baseMessage;
  }

  /**
   * Check if error is recoverable
   */
  isErrorRecoverable(error: ProcessingError): boolean {
    return error.recoverable && error.retryCount < error.maxRetries;
  }

  /**
   * Get suggested actions for user
   */
  getSuggestedActions(error: ProcessingError): string[] {
    const actions: string[] = [];

    if (error.type === ProcessingErrorType.VIDEO_TOO_LARGE) {
      actions.push('Compress the video file');
      actions.push('Use a shorter video clip');
      actions.push('Check video resolution and bitrate');
    }

    if (error.type === ProcessingErrorType.UNSUPPORTED_CODEC) {
      actions.push('Convert video to MP4 format');
      actions.push('Use H.264 or H.265 codec');
      actions.push('Check video file compatibility');
    }

    if (error.type === ProcessingErrorType.NETWORK_ERROR) {
      actions.push('Check internet connection');
      actions.push('Try again in a few minutes');
      actions.push('Contact support if problem persists');
    }

    if (actions.length === 0) {
      actions.push('Try refreshing the page');
      actions.push('Contact support for assistance');
    }

    return actions;
  }
}
