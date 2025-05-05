import { fileURLToPath } from "node:url";
import { resolve as resolvePath } from "node:path";

type UIPaths = {
  html: string;
  js: string;
};

export type UIComponent = "import" | "chart";

export const getStaticFilePaths = (script: UIComponent): UIPaths => {
  const currentDir = fileURLToPath(new URL(".", import.meta.url));

  return {
    html: resolvePath(currentDir, `./${script}/index.html`),
    js: resolvePath(currentDir, `./${script}/index.js`),
  };
};
