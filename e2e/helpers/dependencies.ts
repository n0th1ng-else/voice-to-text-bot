export const injectDependencies = async () => {
  const testHelpers = await import("../helpers.js");
  const tgRequest = await import("../requests/telegram.js");
  const tgStat = await import("../requests/db/botStat.js");
  const certs = await import("../../certs/index.js");
  const botModel = await import("../../src/telegram/bot.js");
  const botCommands = await import("../../src/telegram/types.js");
  const tgApiTypes = await import("../../src/telegram/api/types.js");
  const tgApi = await import("../../src/telegram/api/index.js");
  const recognitionApi = await import("../../src/recognition/index.js");
  const recognitionTypes = await import("../../src/recognition/types.js");
  const constants = await import("../../src/const.js");
  const labels = await import("../../src/text/labels.js");
  const timer = await import("../../src/common/timer.js");
  const externalMock = await import("../requests/google.js");
  const dbClient = await import("../../src/db/index.js");
  const dbNode = await import("../../src/db/sql/nodes.sql.js");
  const dbUsages = await import("../../src/db/sql/usages.sql.js");
  const dbDonations = await import("../../src/db/sql/donations.sql.js");
  const dbEmails = await import("../../src/db/sql/emails.sql.js");
  const env = await import("../../src/env.js");
  const express = await import("../../src/server/express.js");
  const expressHelpers = await import("../../src/server/helpers.js");
  const donationStats = await import("../requests/db/donationStat.js");
  const stripe = await import("../../src/donate/stripe.js");
  const utils = await import("./waitFor.js");
  const emails = await import("../../src/db/emails.js");
  const nodes = await import("../../src/db/nodes.js");
  const usages = await import("../../src/db/usages.js");
  const donations = await import("../../src/db/donations.js");
  const donationTypes = await import("../../src/db/sql/donations.js");
  const cache = await import("../../src/statistic/cache.js");
  const scheduler = await import("../../src/scheduler/index.js");
  const tunnel = await import("../../src/server/tunnel.js");

  return {
    ...testHelpers,
    ...tgRequest,
    ...tgStat,
    ...certs,
    ...botModel,
    ...botCommands,
    ...recognitionApi,
    ...recognitionTypes,
    ...constants,
    ...labels,
    ...timer,
    ...externalMock,
    ...tgApiTypes,
    ...tgApi,
    ...dbClient,
    ...dbNode,
    ...dbUsages,
    ...dbDonations,
    ...dbEmails,
    ...env,
    ...express,
    ...donations,
    ...stripe,
    ...expressHelpers,
    ...utils,
    ...emails,
    ...nodes,
    ...cache,
    ...donationStats,
    ...donationTypes,
    ...scheduler,
    ...tunnel,
    ...usages,
  };
};
