import { z } from "zod";
import { isFileExist, readDirectoryFiles } from "../files/index.js";

/**
 * Whisper-compatible languages. We only added the languages we support atm.
 * See the whole list here:
 * - https://github.com/n0th1ng-else/whisper.cpp/blob/master/src/whisper.cpp#L278
 *
 */

// Downloading the model from GDrive loses the file name and extension
const WHISPER_MODEL_EXTENSIONS = [".part", ".bin"] as const;

export const lookupModel = async (specificModelPath?: string): Promise<string> => {
  /**
   * For local development we use the env variable.
   * For docker, the path starts with ./dist/src/...
   * TODO we can potentially fix it using the process.cwd() as an entrypoint
   */
  const cacheDir = new URL("../../../model-cache", import.meta.url);
  const files = specificModelPath ? [specificModelPath] : await readDirectoryFiles(cacheDir);
  const modelFile = files.find((file) => {
    return WHISPER_MODEL_EXTENSIONS.some((ext) => file.endsWith(ext));
  });

  if (!modelFile) {
    throw new Error("No Whisper model specified (no env path and no cache files found)", {
      cause: files,
    });
  }

  const isExists = await isFileExist(modelFile);
  if (!isExists) {
    throw new Error("The Whisper model does not exist in the file system", {
      cause: {
        files,
        modelFile,
      },
    });
  }

  return modelFile;
};

export const WhisperAddonArchitectureSchema = z
  .union([z.literal("x64"), z.literal("arm")])
  .catch("arm")
  .describe("Supported Whisper addon architectures");

export type WhisperAddonArchitecture = z.infer<typeof WhisperAddonArchitectureSchema>;
