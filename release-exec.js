import { writeFileSync } from "node:fs";

const verifyRelease = (_, context) => {
  const next = context.nextRelease.version;
  writeFileSync(".VERSION", next);
};

export default {
  verifyRelease,
};
