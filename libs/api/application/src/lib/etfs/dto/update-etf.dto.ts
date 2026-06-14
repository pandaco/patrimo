import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { EtfAllocationDto } from '@patrimo/contracts';

export class UpdateEtfDtoBody {
  @IsOptional()
  @IsString()
  @Length(1, 12)
  @Matches(/^[A-Z0-9.^-]+$/, { message: 'ticker must be uppercase letters, digits or . ^ -' })
  ticker?: string;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  issuer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  index?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5)
  ter?: number;

  @IsOptional()
  @IsIn(['EUR', 'USD', 'GBP', 'CHF'])
  currency?: string;

  @IsOptional()
  @IsIn(['Physique', 'Synthétique'])
  repli?: string;

  @IsOptional()
  @IsIn(['Capitalisant', 'Distribuant'])
  distrib?: string;

  @IsOptional()
  @IsBoolean()
  pea?: boolean;

  @IsOptional()
  @IsIn(['Core', 'Satellite', 'Obligations', 'Matières premières'])
  alloc?: EtfAllocationDto;
}
