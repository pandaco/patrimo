import { IsString, Length } from 'class-validator';

export class LookupEtfQueryDto {
  /** Free-text search (ISIN, ticker or name) — bounded so arbitrary payloads never reach Yahoo. */
  @IsString()
  @Length(2, 100)
  query!: string;
}
