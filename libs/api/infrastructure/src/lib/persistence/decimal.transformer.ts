import { ValueTransformer } from 'typeorm';

/** Maps Postgres `numeric` columns (returned as strings by node-pg) to JS numbers. */
export const decimalTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null | undefined => value,
  from: (value: string | null): number | null => (value === null ? null : Number(value)),
};
