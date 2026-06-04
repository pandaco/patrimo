import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User, UserRepository, UserSeed } from 'api-domain';
import { Repository } from 'typeorm';
import { UserOrmEntity } from '../orm-entities/user.orm-entity';

function toDomain(row: UserOrmEntity): User {
  return {
    id: row.id,
    googleId: row.googleId,
    email: row.email,
    name: row.name,
    firstName: row.firstName,
    lastName: row.lastName,
    initials: row.initials,
    picture: row.picture,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

@Injectable()
export class TypeOrmUserRepository implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repo: Repository<UserOrmEntity>,
  ) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findByGoogleId(googleId: string): Promise<User | null> {
    const row = await this.repo.findOne({ where: { googleId } });
    return row ? toDomain(row) : null;
  }

  async upsertFromGoogle(seed: UserSeed): Promise<User> {
    const existing = await this.repo.findOne({ where: { googleId: seed.googleId } });
    const entity: UserOrmEntity = existing
      ? Object.assign(existing, seed)
      : this.repo.create(seed as Partial<UserOrmEntity>);
    const saved: UserOrmEntity = await this.repo.save(entity);
    return toDomain(saved);
  }
}
