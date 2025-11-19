/* eslint-env node */

/* eslint-env node */
module.exports = {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^.+\\.(css|scss|sass|less)$": "identity-obj-proxy",
  },
  setupFilesAfterEnv: ["<rootDir>/src/setupTests.ts"],
  transformIgnorePatterns: ["/node_modules/(?!(three/examples/jsm)/)"],
  transform: {
    "^.+\\.(ts|tsx|js|jsx)$": [
      "babel-jest",
      { configFile: "./babel.config.cjs" },
    ],
  },
  extensionsToTreatAsEsm: [".ts", ".tsx"],
};
