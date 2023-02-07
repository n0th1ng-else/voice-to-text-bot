export default () => {
  process.env.TZ = "UTC";
  const testType = process.env.TEST_PACKAGE || "unit";
  const isE2E = testType === "e2e";

  const e2eConfig = {
    coverageDirectory: "<rootDir>/coverage-e2e",
    testMatch: ["<rootDir>/e2e/**/?(*.)+(spec|test).[jt]s?(x)"],
    maxConcurrency: 1,
  };

  const unitConfig = {
    coverageDirectory: "<rootDir>/coverage-unit",
    testMatch: ["<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)"],
  };

  const commonConfig = {
    extensionsToTreatAsEsm: [".ts"],
    preset: "ts-jest/presets/default-esm",
    moduleNameMapper: {
      "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    modulePathIgnorePatterns: ["<rootDir>/.*/__mocks__"],
    rootDir: ".",
    testEnvironment: "node",
    coveragePathIgnorePatterns: ["/node_modules/"],
    reporters: ["default", "jest-sonar"],
  };

  const envConfig = isE2E ? e2eConfig : unitConfig;
  return {
    ...commonConfig,
    ...envConfig,
  };
};
