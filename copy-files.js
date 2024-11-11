import { fileURLToPath } from "node:url";
import { cpSync } from "node:fs";

const FOLDERS = ["text/translations/bundles", "whisper/addons"];

FOLDERS.forEach((folder) => {
  const src = fileURLToPath(new URL(`./src/${folder}`, import.meta.url));
  const dest = fileURLToPath(new URL(`./dist/src/${folder}`, import.meta.url));
  cpSync(src, dest, { recursive: true });
  console.log(`[copy] Copied ${src} to ${dest}`);
});
