import { Piscina } from "piscina";

type AbortSignalResult = {
  stopAbortSignal: VoidFunction | null;
  signal: AbortSignal | null;
};
const enforceAbortSignal = (timeout: number): AbortSignalResult => {
  if (timeout > 0) {
    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort("Operation timed out!"),
      timeout,
    );
    return {
      stopAbortSignal: () => clearTimeout(timer),
      signal: controller.signal,
    };
  }

  return {
    stopAbortSignal: null,
    signal: null,
  };
};

export const initializePool = <Input = unknown, Output = unknown>() => {
  const piscina = new Piscina<Input, Output>({
    filename: new URL("./transcriberThread.js", import.meta.url).href,
    name: "convertVoiceToText",
    idleTimeout: 60_000,
  });

  return {
    execute: async (options: Input, timeout = 0): Promise<Output> => {
      const { stopAbortSignal, signal } = enforceAbortSignal(timeout);
      const result = await piscina.run(options, { signal });
      stopAbortSignal?.();
      return result;
    },
  };
};
