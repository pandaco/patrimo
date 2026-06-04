import { Envelope, EnvelopeSeed } from '../entities/envelope.entity';

export const ENVELOPE_REPOSITORY = 'ENVELOPE_REPOSITORY';

export interface EnvelopeRepository {
  findById(id: string): Promise<Envelope | null>;
  findByUserId(userId: string): Promise<Envelope[]>;
  create(seed: EnvelopeSeed): Promise<Envelope>;
  /** Apply `patch` to the envelope iff it belongs to `userId`. */
  updateForUser(
    id: string,
    userId: string,
    patch: Partial<EnvelopeSeed>,
  ): Promise<Envelope | null>;
  /** Delete the envelope iff it belongs to `userId`. Cascades to its transactions. */
  deleteForUser(id: string, userId: string): Promise<boolean>;
}
