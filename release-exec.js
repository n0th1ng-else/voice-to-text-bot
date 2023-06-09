import { writeFileSync } from "fs";

const verifyRelease = async (_, context) => {
  const next = context.nextRelease.version;
  writeFileSync(".VERSION", next);
};

export default {
  verifyRelease,
};
