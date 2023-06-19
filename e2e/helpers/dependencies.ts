export const injectTestDependencies = async () => {
  const testHelpers = await import("../helpers.js");
  const tgRequest = await import("../requests/telegram.js");
  const tgStat = await import("../requests/db/botStat.js");
  const externalMock = await import("../requests/google.js");
  const donationStats = await import("../requests/db/donationStat.js");

  return {
    ...testHelpers,
    ...tgRequest,
    ...tgStat,
    ...externalMock,
    ...donationStats,
  };
};

export type InjectedTestFn = Awaited<ReturnType<typeof injectTestDependencies>>;
