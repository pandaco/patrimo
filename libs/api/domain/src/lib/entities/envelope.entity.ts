export interface Envelope {
  id: string;
  userId: string;
  code: string;
  glyph: string;
  label: string;
  broker: string;
  value: number;
  invested: number;
  cash: number;
  openedAt: Date;
  plafond: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type EnvelopeSeed = Omit<Envelope, 'id' | 'createdAt' | 'updatedAt'>;
