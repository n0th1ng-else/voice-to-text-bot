import { nodeEnvironment } from "../env.js";

export const isDevelopment = () => {
  return nodeEnvironment === "development";
};
