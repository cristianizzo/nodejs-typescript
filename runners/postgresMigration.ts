import Postgres from "@modules/postgres";
import Migrate from "@models/postgres/utils/migrate";
import logger from "@logger";

const llo = logger.logMeta.bind(null, { service: "runner:postgres:migration" });

async function commander() {
  if (process.argv.length < 2) {
    throw new Error("need params");
  }
  const cmd = process.argv[2].trim();
  let executedCmd;

  logger.info(`${cmd.toUpperCase()} BEGIN`, llo({}));

  await Postgres.connect();
  Migrate.SetSequelize(Postgres.sequelize);

  switch (cmd) {
    case "status":
      executedCmd = Migrate.Status();
      break;

    case "up":
    case "migrate":
      executedCmd = Migrate.Migrate();
      break;

    case "next":
    case "migrate-next":
      executedCmd = Migrate.MigrateNext();
      break;

    case "down":
    case "reset":
      executedCmd = Migrate.Reset();
      break;

    case "prev":
    case "reset-prev":
      executedCmd = Migrate.ResetPrev();
      break;

    case "reset-hard":
      executedCmd = Migrate.HardReset();
      break;

    default:
      throw new Error(`invalid cmd: ${cmd}`);
  }

  return executedCmd
    .then(async () => {
      const doneStr = `${cmd.toUpperCase()} DONE`;
      logger.info(doneStr, llo({}));
      logger.info("=".repeat(doneStr.length), llo({}));
      return true;
    })
    .catch(async (error: any) => {
      const errorStr = `${cmd.toUpperCase()} ERROR`;
      logger.error(errorStr, llo({ error }));
    })
    .then(() => {
      if (cmd !== "status" && cmd !== "reset-hard") {
        return Migrate.Status();
      }
      return true;
    });
}


commander()
  .then(() => process.exit(0)) // eslint-disable-line no-process-exit
  .catch((error) => logger.error("global error", llo({ error })));
