import axios, { AxiosRequestConfig } from "axios";
import { sleepFor } from "./timer.js";

export const parseChunkedResponse = <Dto>(body = ""): Dto[] => {
  // Split by newline, trim, remove empty lines
  const chunks = body
    .split("\r\n")
    .map((chunk) => chunk.trim())
    .filter((chunk) => Boolean(chunk.length));

  // Loop through the chunks and try to Json.parse
  return chunks.reduce<{ prev: string; acc: Dto[] }>(
    ({ prev, acc }, chunk) => {
      const newPrev = `${prev}${chunk}`;
      try {
        const newChunk: Dto = JSON.parse(newPrev);
        return { prev: "", acc: [...acc, newChunk] };
      } catch (err) {
        return { prev: newPrev, acc };
      }
    },
    { prev: "", acc: [] },
  ).acc;
};

const runRequest = async <Response>(
  config: AxiosRequestConfig,
): Promise<Response> => {
  const response = await axios.request<Response>(config);
  if (response.status !== 200) {
    throw new Error("The api request was unsuccessful");
  }
  return response.data;
};

export const runRequestWithTimeout = async <Response>(
  config: AxiosRequestConfig,
  timeoutMs?: number,
): Promise<Response> => {
  const timeoutErr = new Error(
    "Streaming network request took too long to resolve",
    {
      cause: {
        url: config.url,
        timeout: config.timeout,
      },
    },
  );
  let timedOut = false;
  return timeoutMs
    ? Promise.race([
        runRequest<Response>({ ...config, timeout: timeoutMs }).then((data) => {
          if (timedOut) {
            throw timeoutErr;
          }

          return data;
        }),
        sleepFor(timeoutMs + 50).then(() => {
          timedOut = true;
          throw timeoutErr;
        }),
      ])
    : runRequest(config);
};
