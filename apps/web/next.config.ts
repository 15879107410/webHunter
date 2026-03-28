import { PHASE_DEVELOPMENT_SERVER } from "next/constants";
import type { NextConfig } from "next";

export default function createNextConfig(phase: string): NextConfig {
  return {
    // Keep dev and build artifacts separate so verify/build does not break the running dev server.
    distDir: phase === PHASE_DEVELOPMENT_SERVER ? ".next-dev" : ".next",
    transpilePackages: ["@webhunter/shared"]
  };
}
