import {
  defaultExclude,
  coverageConfigDefaults,
  defineConfig,
} from "vitest/config";

const isCI = process.env.GITHUB_ACTIONS === "true";

export default defineConfig({
  test: {
    reporters: isCI
      ? [
          "default",
          "github-actions",
          [
            "vitest-sonar-reporter",
            { outputFile: "coverage/sonar-report.xml" },
          ],
        ]
      : ["default"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: ["**/__mocks__/**", ...coverageConfigDefaults.exclude],
    },
    globalSetup: "./vitest.setup.ts",
    environment: "node",
    include: [],
    exclude: [...defaultExclude],
    workspace: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["./src/**/?(*.)+(spec|test).[jt]s?(x)"],
          testTimeout: 2000,
        },
      },
      {
        extends: true,
        test: {
          name: "e2e",
          include: ["./e2e/**/?(*.)+(spec|test).[jt]s?(x)"],
          testTimeout: 5000,
        },
      },
    ],
  },
});
