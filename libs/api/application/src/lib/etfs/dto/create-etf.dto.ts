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
import { CreateEtfDto, EtfAllocationDto } from '@patrimo/contracts';

export class CreateEtfDtoBody implements CreateEtfDto {
  @IsString()
  @Matches(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/, { message: 'isin must be a valid 12-character ISIN' })
  isin!: string;

  @IsString()
  @Length(1, 12)
  @Matches(/^[A-Z0-9.^-]+$/, { message: 'ticker must be uppercase letters, digits or . ^ -' })
  ticker!: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  issuer?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  index?: string;

  @IsNumber()
  @Min(0)
  @Max(5)
  ter!: number;

  @IsIn(['EUR', 'USD', 'GBP', 'CHF'])
  currency!: string;

  @IsOptional()
  @IsIn(['Physique', 'Synthétique'])
  repli?: string;

  @IsIn(['Capitalisant', 'Distribuant'])
  distrib!: string;

  @IsBoolean()
  pea!: boolean;

  @IsIn(['Core', 'Satellite', 'Obligations'])
  alloc!: EtfAllocationDto;
}
