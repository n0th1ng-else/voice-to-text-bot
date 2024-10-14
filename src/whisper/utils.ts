import type { LanguageCode } from "../recognition/types.js";
import { isFileExist, readDirectoryFiles } from "../files/index.js";

type WhisperSupportedLanguage =
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  import("./whisper-addon.cjs").WhisperSupportedLanguage;

export const mapAppLanguageToWhisperLanguage = (
  languageCode: LanguageCode,
): WhisperSupportedLanguage => {
  switch (languageCode) {
    case "ru-RU":
      return "ru";
    case "en-US":
      return "en";
    default:
      throw new Error(`The language code "${languageCode}" is not supported?`);
  }
};

export const lookupModel = async (
  specificModelPath?: string,
): Promise<string> => {
  const cacheDir = new URL("../../model-cache", import.meta.url);
  const files = specificModelPath
    ? [specificModelPath]
    : await readDirectoryFiles(cacheDir);
  const modelFile = files.find((file) => file.endsWith(".bin"));

  if (!modelFile) {
    throw new Error(
      "No Whisper model specified (no env path and no cache files found)",
    );
  }

  const isExists = await isFileExist(modelFile);
  if (!isExists) {
    throw new Error("The Whisper model does not exist in the file system");
  }

  return modelFile;
};
