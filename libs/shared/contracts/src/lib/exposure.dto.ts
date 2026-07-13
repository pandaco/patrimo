export interface ExposureDto {
  key: string;
  pct: number;
}

export interface PortfolioExposureDto {
  geography: ExposureDto[];
  sector: ExposureDto[];
  currency: ExposureDto[];
}
