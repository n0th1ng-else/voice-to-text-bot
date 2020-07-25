import { createHash } from "crypto";

export const getMd5Hash = (
  base: string,
  salt = new Date().getTime()
): string => {
  return createHash("md5").update(`${base}:${salt}`).digest("hex");
};
