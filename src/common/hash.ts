import { createHash } from "crypto";

type HashPart = string | number;

export const getMd5Hash = (...parts: HashPart[]): string => {
  return createHash("md5")
    .update(
      parts
        .map((part) => (typeof part === "string" ? part : String(part)))
        .join(":")
    )
    .digest("hex");
};
