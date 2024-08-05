import { cpSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Folders from the root
const FOLDERS = ["src/text/translations/bundles"] as const;

const getPaths = (path: string): { src: string; dest: string } => {
  return {
    src: fileURLToPath(new URL(`../../${path}`, import.meta.url)),
    dest: fileURLToPath(new URL(`../${path}`, import.meta.url)),
  };
};

const copyFolders = () => {
  FOLDERS.forEach((folder) => {
    const { src, dest } = getPaths(folder);
    cpSync(src, dest, { recursive: true });
  });
};

copyFolders();
