import nock from "nock";

export const trackNotMatchedRoutes = () => {
  let notMatchedRoutes: string[] = [];
  nock.emitter.on("no match", (req) => {
    if (req.path.startsWith("/bot/message/")) {
      // ignore the request we send from the test into application
      return;
    }

    notMatchedRoutes.push(req.path);
  });

  return (): boolean => {
    if (!notMatchedRoutes.length) {
      return true;
    }

    const routes = notMatchedRoutes.map((r) => `- ${r}`).join("\n");
    notMatchedRoutes = [];
    throw new Error(`some routes are not mocked:\n${routes}`, { cause: ["asd"] });
  };
};
