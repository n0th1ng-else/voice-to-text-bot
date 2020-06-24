import { createHash } from "crypto";

export const getMd5Hash = (base: string): string => {
  const salt = new Date().getTime();
  return createHash("md5").update(`${base}:${salt}`).digest("hex");
};
