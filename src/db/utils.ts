export type DbConnectionConfig = {
  user: string;
  password: string;
  host: string;
  database: string;
  port: number;
  certificate?: string;
};

type DbConfigState = "invalid" | "unsecure" | "valid";

export const validateConfigState = (config: DbConnectionConfig): DbConfigState => {
  const { certificate, ...cfg } = config;
  const coreFieldsValid = Object.values(cfg).every(Boolean);

  if (!coreFieldsValid) {
    return "invalid";
  }

  return certificate ? "valid" : "unsecure";
};

export const isDBConfigValid = (config: DbConnectionConfig): boolean => {
  return validateConfigState(config) !== "invalid";
};
