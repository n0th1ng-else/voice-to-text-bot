import { get as httpsGet } from "https";
import { get as httpGet } from "http";

export function runGetDto<R>(url: string): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    const isHttps = /^https:\/\/.+/;
    const getHandler = isHttps.test(url) ? httpsGet : httpGet;

    getHandler(url, (response) => {
      let body = "";
      response.on("data", (chunk) => (body += chunk));
      response.on("end", () => {
        try {
          const obj: R = JSON.parse(body);
          resolve(obj);
        } catch (err) {
          reject(err);
        }
      });
    }).on("error", (err) => reject(err));
  });
}

export function runGetBuffer(url: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const isHttps = /^https:\/\/.+/;
    const getHandler = isHttps.test(url) ? httpsGet : httpGet;

    getHandler(url, (response) => {
      const buff: Buffer[] = [];
      response.on("data", (chunk) => buff.push(chunk));
      response.on("error", (err) => reject(err));
      response.on("end", () => resolve(Buffer.concat(buff)));
    }).on("error", (err) => reject(err));
  });
}
