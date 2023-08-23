import { writeFileSync } from "fs";

const verifyRelease = (_, context) => {
  const next = context.nextRelease.version;
  writeFileSync(".VERSION", next);
};

export default {
  verifyRelease,
};
