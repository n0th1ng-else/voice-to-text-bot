import { nodeEnvironment } from "../env.ts";

export const isDevelopment = (): boolean => {
  return nodeEnvironment === "development";
};

export const parseMultilineEnvVariable = (value: string): string => {
  return value.split("\\n").join("\n");
};
