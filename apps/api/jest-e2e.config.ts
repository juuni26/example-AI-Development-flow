import type { Config } from "jest";

const config: Config = {
  rootDir: ".",
  testMatch: ["<rootDir>/test/**/*.e2e-spec.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.json", isolatedModules: true }],
  },
  moduleFileExtensions: ["ts", "js", "json"],
  testTimeout: 60_000,
  // One Postgres container per test file (jest worker) avoids cross-file
  // interference and lets `--runInBand` keep startup cost low.
  maxWorkers: 1,
};

export default config;
