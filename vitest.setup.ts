import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Minimal env so modules that call getServerEnv() during unit tests don't throw.
// (Vitest already sets NODE_ENV=test.)
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test?schema=public";
process.env.AUTH_SECRET ??= "test-secret-value-at-least-16-chars-long";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";

afterEach(() => {
  cleanup();
});
