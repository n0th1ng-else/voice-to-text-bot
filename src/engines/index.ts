export type RuntimeEngineType = "node" | "unknown";

type EngineType = {
  engine: RuntimeEngineType;
  version: string;
};

export const getRuntimeEngineType = (): EngineType => {
  const nodeVersion = process.versions?.node;

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
