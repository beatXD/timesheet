import type { Config } from "jest";
import nextJest from "next/jest";

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

const customJestConfig: Config = {
  // Setup files to run before tests
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],

  // Test environment
  testEnvironment: "jsdom",

  // Module path aliases (matching tsconfig paths)
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },

  // Test file patterns
  testMatch: [
    "**/__tests__/**/*.[jt]s?(x)",
    "**/?(*.)+(spec|test).[jt]s?(x)",
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    "<rootDir>/node_modules/",
    "<rootDir>/.next/",
  ],

  // Coverage configuration
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,jsx,ts,tsx}",
    "!src/types/**/*",
  ],

  // Coverage thresholds (adjust as needed)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },

  // Transform files
  transform: {
    "^.+\\.(t|j)sx?$": [
      "@swc/jest",
      {
        jsc: {
          transform: {
            react: {
              runtime: "automatic",
            },
          },
        },
      },
    ],
  },

  // Module file extensions
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],

  // Verbose output
  verbose: true,
};

export default createJestConfig(customJestConfig);
