export const injectDependencies = async () => {
  const certs = await import("../../certs/index.js");
  const botModel = await import("../telegram/bot.js");
  const botCommands = await import("../telegram/types.js");
  const tgApiTypes = await import("../telegram/api/types.js");
  const tgApi = await import("../telegram/api/tgapi.js");
  const recognitionApi = await import("../recognition/index.js");
  const recognitionTypes = await import("../recognition/types.js");
  const constants = await import("../const.js");
  const labels = await import("../text/labels.js");
  const timer = await import("../common/timer.js");
  const dbClient = await import("../db/index.js");
  const dbNode = await import("../db/sql/nodes.sql.js");
  const dbUsages = await import("../db/sql/usages.sql.js");
  const dbDonations = await import("../db/sql/donations.sql.js");
  const dbEmails = await import("../db/sql/emails.sql.js");
  const env = await import("../env.js");
  const express = await import("../server/express.js");
  const expressHelpers = await import("../server/api.js");
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

  return {
    ...certs,
    ...botModel,
    ...botCommands,
    ...recognitionApi,
    ...recognitionTypes,
    ...constants,
    ...labels,
    ...timer,
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
    ...donationTypes,
    ...scheduler,
    ...tunnel,
    ...usages,
  };
};
