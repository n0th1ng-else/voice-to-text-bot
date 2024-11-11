import { fileURLToPath } from "node:url";
import { cpSync } from "node:fs";

const FOLDERS = ["text/translations/bundles", "whisper/addons"] as const;

const getAbsolutePath = (folder: string, prefix: string): string => {
  return fileURLToPath(new URL(`${prefix}/${folder}`, import.meta.url))
}

FOLDERS.forEach((folder) => {
  const src = getAbsolutePath(folder, '../src');
  const dest =  getAbsolutePath(folder, './src');
  cpSync(src, dest, { recursive: true });
  console.log(`[copy] Copied ${src} to ${dest}`);
});
