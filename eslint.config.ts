import eslint from "@eslint/js";
import { defineConfig, includeIgnoreFile } from "eslint/config";
import tseslint from "typescript-eslint";
import { fileURLToPath } from "node:url";
import tsParser from "@typescript-eslint/parser";


export default defineConfig(
  includeIgnoreFile(
    fileURLToPath(new URL(".gitignore", import.meta.url)),
    "Imported .gitignore patterns"
  ),
  {
    languageOptions: {
      ecmaVersion: "latest",
      parser: tsParser,
      parserOptions: {
        projectService: true,
      },
    },
  },
  eslint.configs.recommended,
  {
    files: ["src/**/*.ts", "src/**/*.js"],
    ignores: ["src/**/*.test.ts"],
    extends: [...tseslint.configs.recommended],
    rules: {
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/consistent-indexed-object-style": ["error", "record"],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
);