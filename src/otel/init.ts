import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"; // Optional for traces
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { ATTR_DEPLOYMENT_ENVIRONMENT_NAME } from "@opentelemetry/semantic-conventions/incubating";
import { logs } from "@opentelemetry/api-logs";
import {
  LoggerProvider,
  BatchLogRecordProcessor,
} from "@opentelemetry/sdk-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { appVersion, grafana, nodeEnvironment } from "../env.js";
import { isLocal, isOtelEnabled } from "./utils.js";

const getObservabilityConfig = (path: "metrics" | "traces" | "logs") => {
  const OTPL_ENDPOINT = grafana.host;
  const OTPL_AUTH_TOKEN = grafana.token;
  return {
    url: `${OTPL_ENDPOINT}/v1/${path}`,
    headers: {
      Authorization: `Basic ${OTPL_AUTH_TOKEN}`,
    },
  };
};

const appResource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: isLocal() ? "voice-to-text-local" : "voice-to-text",
  [ATTR_SERVICE_VERSION]: appVersion,
  [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: nodeEnvironment,
});

const metricExporter = new OTLPMetricExporter(
  getObservabilityConfig("metrics"),
);

const metricReader = new PeriodicExportingMetricReader({
  exporter: metricExporter,
  exportIntervalMillis: 10_000,
});

const traceExporter = new OTLPTraceExporter(getObservabilityConfig("traces"));

const logExporter = new OTLPLogExporter(getObservabilityConfig("logs"));

const loggerProvider = new LoggerProvider({
  resource: appResource,
});

loggerProvider.addLogRecordProcessor(new BatchLogRecordProcessor(logExporter));

logs.setGlobalLoggerProvider(loggerProvider);

const sdk = new NodeSDK({
  resource: appResource,
  metricReader: metricReader,
  traceExporter: traceExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

if (isOtelEnabled()) {
  sdk.start();
}

export const stopOtelMonitoring = async (): Promise<void> => {
  if (isOtelEnabled()) {
    await sdk.shutdown();
  }
};
