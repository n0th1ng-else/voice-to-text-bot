import { writeHeapSnapshot } from "node:v8";
import { deleteFileIfExists, getFullFileName, readFile } from "../files/index.js";

/**
 * Dump the Memory snapshot to the filesystem.
 * BLOCKING OPERATION - blocks the even loop while calculating.
 * take ~x2 memory for the container!
 */
export const generateMemorySnapshotAsBuffer = async (): Promise<Buffer> => {
  const filename = writeHeapSnapshot(getFullFileName("dump.heapsnapshot", true));
  const buffer = await readFile(filename);
  await deleteFileIfExists(filename);
  return buffer;
};
