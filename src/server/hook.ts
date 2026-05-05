import type { FastifyInstance } from "fastify";
import type { VoidFunction } from "../common/types.js";
import { fetchPropFromUnknown } from "../common/unknown.js";

export type HookMetadata = {
  url?: string;
  method?: string;
  userId?: string;
  chatId?: string;
  lang?: string;
};

export const setFastifyPreHandler = (
  app: FastifyInstance,
  callback: (meta: HookMetadata, doneFn: VoidFunction) => void,
): void => {
  app.addHook("preHandler", (request, _reply, done) => {
    const { routeOptions, body } = request;
    /**
     * @see https://github.com/getsentry/sentry-javascript/pull/9138/files
     */
    const requestMessage = fetchPropFromUnknown(body, "message", {});
    const requestUserLanguage = fetchPropFromUnknown<string>(
      fetchPropFromUnknown(requestMessage, "from", {}),
      "language_code",
      "",
    );
    const requestUserId = fetchPropFromUnknown<string>(
      fetchPropFromUnknown(requestMessage, "from", {}),
      "id",
      "",
    );
    const requestChatId = fetchPropFromUnknown<string>(
      fetchPropFromUnknown(requestMessage, "chat", {}),
      "id",
      "",
    );

    const url = routeOptions.url || request.url;
    const method = routeOptions.method || request.method;

    callback(
      {
        url,
        method: Array.isArray(method) ? method.at(0) : method,
        userId: requestUserId,
        chatId: requestChatId,
        lang: requestUserLanguage,
      },
      done,
    );
  });
};
