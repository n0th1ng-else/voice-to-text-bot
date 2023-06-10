export default () => {
  process.env.TZ = "UTC";

  /** @type {import('jest').Config} */
  const commonCfg = {
    extensionsToTreatAsEsm: [".ts"],
    preset: "ts-jest/presets/default-esm",
    moduleNameMapper: {
      "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    modulePathIgnorePatterns: ["<rootDir>/.*/__mocks__"],
    rootDir: ".",
    testEnvironment: "node",
    coveragePathIgnorePatterns: ["/node_modules/"],
  };

  /** @type {import('jest').Config} */
  return {
    reporters: ["default", "jest-sonar"],
    testTimeout: 30000,
    ...commonCfg,
    projects: [
      {
        displayName: "unit",
        testMatch: ["<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)"],
        ...commonCfg,
      },
      {
        displayName: "e2e",
        testMatch: ["<rootDir>/e2e/**/?(*.)+(spec|test).[jt]s?(x)"],
        ...commonCfg,
      },
    ],
  };
};
