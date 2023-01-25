import pg from "pg";
import newrelic from "newrelic";
import { flattenPromise } from "../common/helpers";

const launchMonitoringAgentNewrelic = (): Promise<void> => {
  newrelic.instrumentLoadedModule("pg", pg);
  return Promise.resolve();
  // .then(() => import("newrelic"))
  // .then(flattenPromise)
};

export const launchMonitoringAgent = (): Promise<void> => {
  return Promise.all([launchMonitoringAgentNewrelic()]).then(flattenPromise);
};
