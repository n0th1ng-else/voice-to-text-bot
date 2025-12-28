export type RuntimeEngineType = "node" | "bun" | "unknown";

type EngineType = {
  engine: RuntimeEngineType;
  version: string;
};

export const getRuntimeEngineType = (): EngineType => {
  const bunVersion = process.versions?.bun;
  const nodeVersion = process.versions?.node;

  if (bunVersion) {
    return {
      engine: "bun",
      version: bunVersion,
    };
  }

  if (nodeVersion) {
    return {
      engine: "node",
      version: nodeVersion,
    };
  }

  return {
    engine: "unknown",
    version: "n/a",
  };
};

export const isBun = (): boolean => {
  const { engine } = getRuntimeEngineType();
  return engine === "bun";
};
