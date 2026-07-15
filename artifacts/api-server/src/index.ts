import app from "./app";
import { logger } from "./lib/logger";
import { db, appSettingsTable, setSupabaseCredentials } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function loadSupabaseCredsFromDb() {
  try {
    const rows = await db.select().from(appSettingsTable).limit(1);
    const settings = rows[0];
    if (settings?.supabaseUrl && settings?.supabaseServiceRoleKey) {
      setSupabaseCredentials(settings.supabaseUrl, settings.supabaseServiceRoleKey);
      logger.info("Supabase credentials loaded from database");
    }
  } catch (err) {
    logger.warn({ err }, "Could not load Supabase credentials from DB (non-fatal)");
  }
}

loadSupabaseCredsFromDb().then(() => {
  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
});
