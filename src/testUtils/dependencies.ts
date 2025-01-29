export const injectDependencies = async () => {
  const certs = await import("../../certs/index.ts");
  const botModel = await import("../telegram/bot.ts");
  const botCommands = await import("../telegram/types.ts");
  const tgApiTypes = await import("../telegram/api/types.ts");
  const tgApi = await import("../telegram/api/tgapi.ts");
  const recognitionApi = await import("../recognition/index.ts");
  const recognitionTypes = await import("../recognition/types.ts");
  const constants = await import("../const.ts");
  const translationKeys = await import("../text/types.ts");
  const timer = await import("../common/timer.ts");
  const getDb = await import("../db/index.ts");
  const dbClient = await import("../db/client.ts");
  const dbNode = await import("../db/sql/nodes.sql.ts");
  const dbUsages = await import("../db/sql/usages.sql.ts");
  const dbDonations = await import("../db/sql/donations.sql.ts");
  const dbEmails = await import("../db/sql/emails.sql.ts");
  const dbDurations = await import("../db/sql/durations.sql.ts");
  const dbIgnoredChats = await import("../db/sql/ignoredchats.sql.ts");
  const env = await import("../env.ts");
  const server = await import("../server/bot-server-new.ts");
  const serverHelpers = await import("../server/api.ts");
  const stripe = await import("../donate/stripe.ts");
  const utils = await import("./waitFor.ts");
  const emails = await import("../db/emails.ts");
  const nodes = await import("../db/nodes.ts");
  const usages = await import("../db/usages.ts");
  const donations = await import("../db/donations.ts");
  const donationTypes = await import("../db/sql/donations.ts");
  const cache = await import("../statistic/cache.ts");
  const scheduler = await import("../scheduler/index.ts");
  const tunnel = await import("../server/tunnel.ts");
  const translator = await import("../text/index.ts");
  const translationsLoader = await import("../text/translations/loader.ts");

  return {
    ...certs,
    ...botModel,
    ...botCommands,
    ...recognitionApi,
    ...recognitionTypes,
    ...constants,
    ...translationKeys,
    ...translationsLoader,
    ...translator,
    ...timer,
    ...tgApiTypes,
    ...tgApi,
    ...getDb,
    ...dbClient,
    ...dbNode,
    ...dbUsages,
    ...dbDonations,
    ...dbEmails,
    ...dbDurations,
    ...dbIgnoredChats,
    ...env,
    ...server,
    ...donations,
    ...stripe,
    ...serverHelpers,
    ...utils,
    ...emails,
    ...nodes,
    ...cache,
    ...donationTypes,
    ...scheduler,
    ...tunnel,
    ...usages,
  };
};

export type InjectedFn = Awaited<ReturnType<typeof injectDependencies>>;
