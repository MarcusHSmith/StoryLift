/**
 * Service for managing temporary files during video processing
 * Handles cleanup and memory management for processing operations
 */
export interface TempFileInfo {
  id: string;
  type: 'video' | 'audio' | 'frame' | 'output';
  size: number;
  createdAt: Date;
  expiresAt: Date;
  path: string;
}

export class TempStorageService {
  private static instance: TempStorageService;
  private tempFiles: Map<string, TempFileInfo> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly MAX_FILE_AGE = 30 * 60 * 1000; // 30 minutes
  private readonly MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500 MB
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    this.startCleanupService();
  }

  static getInstance(): TempStorageService {
    if (!TempStorageService.instance) {
      TempStorageService.instance = new TempStorageService();
    }
    return TempStorageService.instance;
  }

  /**
   * Register a temporary file
   */
  registerTempFile(
    type: TempFileInfo['type'],
    size: number,
    path: string
  ): string {
    const id = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const fileInfo: TempFileInfo = {
      id,
      type,
      size,
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.MAX_FILE_AGE),
      path,
    };

    this.tempFiles.set(id, fileInfo);
    this.enforceSizeLimit();

    return id;
  }

  /**
   * Get information about a temporary file
   */
  getTempFileInfo(id: string): TempFileInfo | undefined {
    return this.tempFiles.get(id);
  }

  /**
   * Mark a temporary file as accessed (extends expiration)
   */
  touchTempFile(id: string): boolean {
    const fileInfo = this.tempFiles.get(id);
    if (!fileInfo) return false;

    fileInfo.expiresAt = new Date(Date.now() + this.MAX_FILE_AGE);
    return true;
  }

  /**
   * Remove a specific temporary file
   */
  removeTempFile(id: string): boolean {
    const fileInfo = this.tempFiles.get(id);
    if (!fileInfo) return false;

    try {
      // In a browser environment, we can't actually delete files
      // This is more for tracking and cleanup purposes
      this.tempFiles.delete(id);
      return true;
    } catch (error) {
      console.warn(`Failed to remove temp file ${id}:`, error);
      return false;
    }
  }

  /**
   * Get total size of all temporary files
   */
  getTotalSize(): number {
    let total = 0;
    for (const fileInfo of this.tempFiles.values()) {
      total += fileInfo.size;
    }
    return total;
  }

  /**
   * Get count of temporary files
   */
  getFileCount(): number {
    return this.tempFiles.size;
  }

  /**
   * Enforce size limit by removing oldest files
   */
  private enforceSizeLimit(): void {
    let totalSize = this.getTotalSize();

    if (totalSize <= this.MAX_TOTAL_SIZE) return;

    // Sort files by creation time (oldest first)
    const sortedFiles = Array.from(this.tempFiles.values()).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
    );

    // Remove files until we're under the limit
    for (const fileInfo of sortedFiles) {
      if (totalSize <= this.MAX_TOTAL_SIZE) break;

      this.removeTempFile(fileInfo.id);
      totalSize -= fileInfo.size;
    }
  }

  /**
   * Start the cleanup service
   */
  private startCleanupService(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredFiles();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Clean up expired temporary files
   */
  private cleanupExpiredFiles(): void {
    const now = new Date();
    const expiredFiles: string[] = [];

    for (const [id, fileInfo] of this.tempFiles.entries()) {
      if (fileInfo.expiresAt <= now) {
        expiredFiles.push(id);
      }
    }

    expiredFiles.forEach((id) => this.removeTempFile(id));

    if (expiredFiles.length > 0) {
      console.log(`Cleaned up ${expiredFiles.length} expired temporary files`);
    }
  }

  /**
   * Clean up all temporary files
   */
  cleanupAll(): void {
    const fileIds = Array.from(this.tempFiles.keys());
    fileIds.forEach((id) => this.removeTempFile(id));
    console.log(`Cleaned up all ${fileIds.length} temporary files`);
  }

  /**
   * Stop the cleanup service
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Get cleanup statistics
   */
  getStats(): {
    totalFiles: number;
    totalSize: number;
    oldestFile: Date | null;
    newestFile: Date | null;
  } {
    if (this.tempFiles.size === 0) {
      return {
        totalFiles: 0,
        totalSize: 0,
        oldestFile: null,
        newestFile: null,
      };
    }

    const files = Array.from(this.tempFiles.values());
    const oldestFile = files.reduce((oldest, current) =>
      current.createdAt < oldest.createdAt ? current : oldest
    ).createdAt;
    const newestFile = files.reduce((newest, current) =>
      current.createdAt > newest.createdAt ? current : newest
    ).createdAt;

    return {
      totalFiles: this.tempFiles.size,
      totalSize: this.getTotalSize(),
      oldestFile,
      newestFile,
    };
  }
}
