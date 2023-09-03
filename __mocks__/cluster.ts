import { jest } from "@jest/globals";

export const mocks = {
  getIsMaster: jest.fn(() => true),
  getWorkerId: jest.fn(() => 0),
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
