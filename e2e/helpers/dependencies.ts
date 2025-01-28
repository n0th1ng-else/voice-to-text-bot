export const injectTestDependencies = async () => {
  const testHelpers = await import("../helpers.ts");
  const tgRequest = await import("../requests/telegram.ts");
  const tgStat = await import("../requests/db/botStat.ts");
  const externalMock = await import("../requests/google.ts");
  const donationStats = await import("../requests/db/donationStat.ts");
  const ignoredChatsDb = await import("../requests/db/ignoredChatsDb.ts");
  const nockUtils = await import("../requests/common.ts");

  return {
    ...testHelpers,
    ...tgRequest,
    ...tgStat,
    ...externalMock,
    ...donationStats,
    ...ignoredChatsDb,
    ...nockUtils,
  };
};

export type InjectedTestFn = Awaited<ReturnType<typeof injectTestDependencies>>;
