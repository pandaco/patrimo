export interface ExposureDto {
  key: string;
  pct: number;
}

export interface PortfolioExposureDto {
  geo: ExposureDto[];
  sector: ExposureDto[];
  currency: ExposureDto[];
}
