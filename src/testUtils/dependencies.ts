export const injectDependencies = async () => {
  const certs = await import("../../certs/index.js");
  const botModel = await import("../telegram/bot.js");
  const botCommands = await import("../telegram/types.js");
  const tgApiTypes = await import("../telegram/api/types.js");
  const tgApi = await import("../telegram/api/tgapi.js");
  const recognitionApi = await import("../recognition/index.js");
  const recognitionTypes = await import("../recognition/types.js");
  const constants = await import("../const.js");
  const translationKeys = await import("../text/types.js");
  const timer = await import("../common/timer.js");
  const getDb = await import("../db/index.js");
  const dbClient = await import("../db/client.js");
  const dbNode = await import("../db/sql/nodes.sql.js");
  const dbUsages = await import("../db/sql/usages.sql.js");
  const dbDonations = await import("../db/sql/donations.sql.js");
  const dbEmails = await import("../db/sql/emails.sql.js");
  const dbDurations = await import("../db/sql/durations.sql.js");
  const dbIgnoredChats = await import("../db/sql/ignoredchats.sql.js");
  const env = await import("../env.js");
  const server = await import("../server/bot-server-new.js");
  const serverHelpers = await import("../server/api.js");
  const stripe = await import("../donate/stripe.js");
  const utils = await import("./waitFor.js");
  const emails = await import("../db/emails.js");
  const nodes = await import("../db/nodes.js");
  const usages = await import("../db/usages.js");
  const donations = await import("../db/donations.js");
  const donationTypes = await import("../db/sql/donations.js");
  const cache = await import("../statistic/cache.js");
  const scheduler = await import("../scheduler/index.js");
  const tunnel = await import("../server/tunnel.js");
  const translator = await import("../text/index.js");
  const translationsLoader = await import("../text/translations/loader.js");

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
