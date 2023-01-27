export default () => {
  process.env.TZ = "UTC";
  const testType = process.env.TEST_PACKAGE || "unit";
  const isE2E = testType === "e2e";

  const e2eConfig = {
    coverageDirectory: "<rootDir>/coverage-e2e",
    testMatch: ["<rootDir>/e2e/**/?(*.)+(spec|test).[jt]s?(x)"],
  };

  const unitConfig = {
    coverageDirectory: "<rootDir>/coverage-unit",
    testMatch: ["<rootDir>/src/**/?(*.)+(spec|test).[jt]s?(x)"],
  };

  const commonConfig = {
    extensionsToTreatAsEsm: [".ts"],
    preset: "ts-jest",
    moduleNameMapper: {
      "^(\\.{1,2}/.*)\\.js$": "$1",
    },
    rootDir: ".",
    testEnvironment: "node",
    coveragePathIgnorePatterns: ["/node_modules/"],
    reporters: ["default", "jest-sonar"],
    transform: {
      "^.+\\.tsx?$": [
        "ts-jest",
        {
          useESM: true,
        },
      ],
    },
  };

  const envConfig = isE2E ? e2eConfig : unitConfig;
  return {
    ...commonConfig,
    ...envConfig,
  };
};
