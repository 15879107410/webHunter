import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url))
});

export default [
  ...compat.config({
    extends: ["next/core-web-vitals"]
  }),
  {
    ignores: [
      "**/.next/**",
      "**/.next-dev/**",
      "**/dist/**",
      "**/node_modules/**"
    ]
  }
];
