import { ScheduleDaemon } from "./index.js";
import { requestHealthData } from "../server/api.js";
import { HealthStatus } from "../server/types.js";
import { trackApplicationHealth, trackRecognitionProviderHealth } from "../monitoring/newrelic.js";

export const initHealthDaemon = (selfUrl: string): ScheduleDaemon => {
  return new ScheduleDaemon(
    "health",
    async () => {
      try {
        const value = await requestHealthData(selfUrl);
        const status = value.status === HealthStatus.Online ? "ok" : "error";
        const statuses = value.recognitionEngineStatuses.reduce<Record<string, "ok" | "error">>(
          (acc, itm) => {
            acc[itm.main.provider] = itm.main.state;
            acc[itm.advanced.provider] = itm.advanced.state;
            return acc;
          },
          {},
        );
        trackApplicationHealth(status);
        Object.entries(statuses).forEach(([key, value]) => {
          trackRecognitionProviderHealth(key, value);
        });
      } catch (err) {
        trackApplicationHealth("error");
        throw err;
      }
    },
    {
      skipInitialTick: true,
    },
  );
};
