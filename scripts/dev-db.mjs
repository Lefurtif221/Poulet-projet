import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const databaseDir = path.join(process.cwd(), ".pgdata");
const pg = new EmbeddedPostgres({
  databaseDir,
  user: "guanar",
  password: "guanar",
  port: 5432,
  persistent: true,
  autoRehydrateSymlinks: true,
  initdbFlags: ["--encoding=UTF8", "--locale=C"],
  onLog: () => undefined,
  onError: (error) => console.error("[postgres]", error),
});

if (!existsSync(path.join(databaseDir, "PG_VERSION"))) {
  console.log("Initialisation du cluster PostgreSQL local…");
  await pg.initialise();
}

await pg.start();

try {
  await pg.createDatabase("guanar");
  console.log("Base 'guanar' créée.");
} catch {
  // database already exists
}

console.log("PostgreSQL embarqué prêt sur postgresql://guanar:guanar@localhost:5432/guanar");

const shutdown = async () => {
  try {
    await pg.stop();
  } finally {
    process.exit(0);
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
