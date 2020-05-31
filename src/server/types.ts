export interface HealthDto {
  status: HealthStatus;
  ssl: HealthSsl;
  message: string;
  urls: string[];
}

export enum HealthStatus {
  Error = "ERROR",
  InProgress = "IN_PROGRESS",
  Online = "ONLINE",
}

export enum HealthSsl {
  On = "ON",
  Off = "OFF",
}
