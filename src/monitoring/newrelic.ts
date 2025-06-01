import newrelic from "newrelic";

export const trackUnsuccessfullyProcessedFile = (): void => {
  newrelic.incrementMetric("FileProcessing/Failed");
};
