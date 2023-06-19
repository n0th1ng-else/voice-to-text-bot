import { nodeEnvironment } from "../env.js";

export const isDevelopment = (): boolean => {
  return nodeEnvironment === "development";
};
