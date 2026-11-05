import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  // Сгенерированные SQL-миграции коммитятся и применяются по порядку на любой машине.
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
});
