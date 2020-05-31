import { get } from "https";

export function runGet<R>(url: string): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    get(url, (response) => {
      let body = "";
      response.on("data", (chunk) => (body += chunk));
      response.on("end", () => {
        const obj: R = JSON.parse(body);
        resolve(obj);
      });
    }).on("error", (err) => reject(err));
  });
}
