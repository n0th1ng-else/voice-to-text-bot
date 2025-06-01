import newrelic from "newrelic";

export const trackUnsuccessfullyProcessedFile = (): void => {
  newrelic.incrementMetric("FileProcessing/Failed");
};

export const trackStartProcessingFile = (): void => {
  newrelic.incrementMetric("FileProcessing/Progress");
};
