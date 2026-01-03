import { vi } from "vitest";

export const mocks = {
  getIsMaster: vi.fn((): boolean => true),
  getWorkerId: vi.fn((): number => 0),
};

export default new Proxy(
  {},
  {
    get: (target, prop) => {
      const isMaster = mocks.getIsMaster();
      if (prop === "isMaster") {
        return isMaster;
      }

      if (prop === "worker" && !isMaster) {
        return {
          id: mocks.getWorkerId(),
        };
      }
    },
  },
);
