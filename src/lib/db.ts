import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

export const sql = databaseUrl ? neon(databaseUrl) : null;

let schemaPromise: Promise<void> | null = null;

export function dbConfigured(): boolean {
  return Boolean(databaseUrl);
}

export function ensureSchema(): Promise<void> {
  if (!sql) {
    return Promise.reject(new Error("Connect the following envs: DATABASE_URL"));
  }
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS analyses (
          id text PRIMARY KEY,
          created_at timestamptz DEFAULT now(),
          file_name text,
          duration_s real,
          transcript jsonb,
          result jsonb
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS reports (
          id serial PRIMARY KEY,
          created_at timestamptz DEFAULT now(),
          phone_number text NOT NULL,
          phone_normalized text NOT NULL,
          service text,
          scam_type text,
          notes text,
          analysis_id text,
          contact text,
          opt_in boolean DEFAULT false,
          points int DEFAULT 10
        )
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS reports_phone_normalized_idx
        ON reports (phone_normalized)
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS finance_scans (
          id text PRIMARY KEY,
          user_id text NOT NULL,
          report jsonb,
          created_at timestamptz DEFAULT now()
        )
      `;
    })().catch((err) => {
      schemaPromise = null;
      throw err;
    });
  }
  return schemaPromise;
}
