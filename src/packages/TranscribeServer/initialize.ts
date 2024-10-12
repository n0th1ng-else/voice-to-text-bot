import { initializePool } from "./pool.js";
import { Transcriber, TranscriberInput, TranscriberOutput } from "./types.js";
import { getServer } from "./server.js";
import { getWhisperInstance } from "./whisper.js";

await getWhisperInstance();
const { execute: transcribe } = initializePool<
  TranscriberInput,
  TranscriberOutput
>();

const executeWhisper: Transcriber = (input) => transcribe(input, 100_000);
const server = getServer(executeWhisper);

await server.start(3345);
