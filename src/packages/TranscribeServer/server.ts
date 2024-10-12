import { fastify, type FastifyRequest } from "fastify";
import { getMB } from "../../memory/index.js";
import { mapAppLanguageToWhisperLanguage } from "../../whisper/utils.js";
import type { VoidPromise } from "../../common/types.js";
import type { Transcriber } from "./types.js";
import type { LanguageCode } from "../../recognition/types.js";

type RequestQuery = {
  fileUrl: string;
  lang: LanguageCode;
};

export const getServer = (handler: Transcriber) => {
  const app = fastify({
    bodyLimit: getMB(1), // 1 MB
  });

  app.get(
    "/api/v1/transcribe",
    async (req: FastifyRequest<{ Querystring: RequestQuery }>, reply) => {
      const { fileUrl, lang } = req.query;
      if (!fileUrl) {
        return reply.status(400).send({
          status: 400,
          message: 'Parameter "fileUrl" is not provided',
        });
      }
      if (!lang) {
        return reply.status(400).send({
          status: 400,
          message: 'Parameter "lang" is not provided',
        });
      }

      try {
        const languageCode = mapAppLanguageToWhisperLanguage(lang);
        const result = await handler({
          fileUrl,
          language: languageCode,
        });
        return reply.status(200).send(result);
      } catch (err) {
        console.error("Unable to recognize the text", err);
        return reply.status(500).send({
          status: 500,
          message: "Internal server error",
        });
      }
    },
  );

  return {
    start: (port: number): Promise<VoidPromise> => {
      console.log(`Starting server`);

      return new Promise((resolve) => {
        app.listen({ port, host: "0.0.0.0" }, () => {
          console.log(`The server is listening on ${port}`);
          resolve(
            () =>
              new Promise((resolveFn, rejectFn) => {
                console.warn("Shutting down the server instance");

                app
                  .close()
                  .then(() => {
                    console.warn("The bot server has stopped");
                    resolveFn();
                  })
                  .catch((err) => {
                    console.error("Unable to stop the bot server", err);
                    rejectFn(err);
                  });
              }),
          );
        });
      });
    },
  };
};
