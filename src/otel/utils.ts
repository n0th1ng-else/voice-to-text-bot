import { grafana, selfUrl } from "../env.js";

export const isOtelEnabled = (): boolean => {
  return Boolean(grafana.host) && Boolean(grafana.token);
};

export const isLocal = (): boolean => {
  if (!selfUrl) {
    return true;
  }

  const isLocal = selfUrl.includes("localhost");
  return isLocal;
};
