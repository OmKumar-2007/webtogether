import { Module, Injectable, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PresenceEntity, RoomEntity, UserEntity } from '../../database/entities';
import { PresenceService } from './presence.service';

/**
 * Periodic cleanup of stale presence records from Redis.
 * Runs every minute; expires users who haven't pinged in PRESENCE_OFFLINE_THRESHOLD_MS.
 */
@Injectable()
export class PresenceCleanupCron {
  private readonly logger = new Logger('PresenceCleanup');
  constructor(private readonly presence: PresenceService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async run() {
    const removed = await this.presence.cleanupStale().catch((err) => {
      this.logger.error(`Cleanup failed: ${err.message}`);
      return 0;
    });
    if (removed > 0) this.logger.debug(`Marked ${removed} stale presences offline`);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([PresenceEntity, RoomEntity, UserEntity])],
  providers: [PresenceService, PresenceCleanupCron],
  exports: [PresenceService],
})
export class PresenceModule {}
