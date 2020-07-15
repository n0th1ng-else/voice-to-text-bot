module.exports = () => {
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
    rootDir: ".",
    testEnvironment: "node",
    coveragePathIgnorePatterns: ["/node_modules/"],
    reporters: ["default", "jest-sonar"],
  };

  return Object.assign({}, commonConfig, isE2E ? e2eConfig : unitConfig);
};
