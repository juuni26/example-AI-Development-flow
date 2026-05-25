import { Injectable, Logger, type OnApplicationBootstrap, type OnApplicationShutdown } from "@nestjs/common";
import { RefreshTokenService } from "./refresh-token.service";

const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // hourly — refresh tokens are 7-day, hourly granularity is generous

/**
 * Periodically GCs expired and long-revoked refresh tokens. Without this,
 * the table grows unbounded over the life of the deployment.
 *
 * Runs in-process via setInterval — fine for a single-instance API. A
 * multi-replica deployment should swap this for an external scheduler
 * (cron, k8s CronJob) so the cleanup doesn't fan out N times.
 */
@Injectable()
export class RefreshTokenJanitor implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger("RefreshTokenJanitor");
  private handle: NodeJS.Timeout | null = null;

  constructor(private readonly refresh: RefreshTokenService) {}

  onApplicationBootstrap(): void {
    // Skip in test / disabled environments so suites don't carry an interval
    // that keeps the process alive past app.close().
    if (process.env.NODE_ENV === "test" || process.env.DISABLE_REFRESH_GC === "1") {
      return;
    }
    // Fire once after a short delay so startup logs stay readable, then on
    // the regular cadence.
    setTimeout(() => void this.runOnce(), 30_000);
    this.handle = setInterval(() => void this.runOnce(), CLEANUP_INTERVAL_MS);
  }

  onApplicationShutdown(): void {
    if (this.handle) {
      clearInterval(this.handle);
      this.handle = null;
    }
  }

  private async runOnce(): Promise<void> {
    try {
      const { deleted } = await this.refresh.cleanup();
      if (deleted > 0) {
        this.logger.log(`Cleaned up ${deleted} expired/long-revoked refresh token row(s)`);
      }
    } catch (err) {
      this.logger.error("Cleanup failed", err instanceof Error ? err.stack : String(err));
    }
  }
}
