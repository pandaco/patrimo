import { Envelope, EnvelopeSeed } from '../entities/envelope.entity';

export const ENVELOPE_REPOSITORY = 'ENVELOPE_REPOSITORY';

export interface EnvelopeRepository {
  findById(id: string): Promise<Envelope | null>;
  findByUserId(userId: string): Promise<Envelope[]>;
  create(seed: EnvelopeSeed): Promise<Envelope>;
}
