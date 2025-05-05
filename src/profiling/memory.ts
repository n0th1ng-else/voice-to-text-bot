import { writeHeapSnapshot } from "node:v8";
import {
  deleteFileIfExists,
  getFullFileName,
  readFile,
} from "../files/index.js";

/**
 * Dump the Memory snapshot to the filesystem.
 * BLOCKING OPERATION - blocks the even loop while calculating.
 * take ~x2 memory for the container!
 */
export const generateMemorySnapshot = async (): Promise<File> => {
  const date =
    new Date()
      .toISOString()
      .replace(/-/g, "")
      .replace("T", "-")
      .replace(/:/g, "")
      .split(".")
      .at(0) || "";
  const filename = writeHeapSnapshot(
    getFullFileName("dump.heapsnapshot", true),
  );
  const buffer = await readFile(filename);
  const file = new File([new Blob([buffer])], `Heap-${date}.heapsnapshot`);
  await deleteFileIfExists(filename);
  return file;
};
