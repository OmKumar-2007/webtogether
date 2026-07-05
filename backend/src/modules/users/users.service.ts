import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities/user.entity';
import { AVATAR_COLORS, randomAvatarColor } from '@shared/index';

/**
 * UsersService — upsert/find/delete users.
 *
 * For the MVP, the most important operation is `upsertGuest`, called when
 * a user opens the extension for the first time. The client generates a
 * UUID locally and POSTs it here so we have a stable identity for the
 * participant list, message authorship, and presence events.
 */
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly repo: Repository<UserEntity>,
  ) {}

  /** Returns the user or throws 404. */
  async get(id: string): Promise<UserEntity> {
    const u = await this.repo.findOne({ where: { id } });
    if (!u) throw new NotFoundException(`User ${id} not found`);
    return u;
  }

  /**
   * Idempotent upsert for guest users.
   * If the user already exists, we update display name + avatar color only.
   */
  async upsertGuest(input: {
    id: string;
    displayName: string;
    avatarColor?: string;
    avatarUrl?: string | null;
  }): Promise<UserEntity> {
    const existing = await this.repo.findOne({ where: { id: input.id } });
    if (existing) {
      existing.displayName = input.displayName || existing.displayName;
      if (input.avatarColor) existing.avatarColor = input.avatarColor;
      if (input.avatarUrl !== undefined) existing.avatarUrl = input.avatarUrl;
      return this.repo.save(existing);
    }

    const user = this.repo.create({
      id: input.id,
      displayName: input.displayName,
      avatarColor: input.avatarColor ?? randomAvatarColor(AVATAR_COLORS),
      avatarUrl: input.avatarUrl ?? null,
      isGuest: true,
    });
    return this.repo.save(user);
  }
}
