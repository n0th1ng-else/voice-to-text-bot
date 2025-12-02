import { nodeEnvironment } from "../env.js";

export const isDevelopment = (): boolean => {
  return nodeEnvironment === "development";
};

export const parseMultilineEnvVariable = (value: string): string => {
  return value.split(String.raw`\n`).join("\n");
};
