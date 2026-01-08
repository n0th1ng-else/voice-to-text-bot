import { openAsBlob } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const API_URL = "http://localhost:8087";
const ACCESS_TOKEN = "ss";
const AUDIO_FILE = "../file-temp/3sLhVFF4j2_file_130.oga.wav";
const LANGUAGE = "ru";

// ---------------- SEND FILE ----------------
async function sendAudio() {
  try {
    const currentDir = fileURLToPath(new URL(".", import.meta.url));

    const form = new FormData();
    form.append("language", LANGUAGE);

    const fileBlob = await openAsBlob(resolve(currentDir, AUDIO_FILE));
    form.append("file", fileBlob, "filename.wav");

    const response = await fetch(`${API_URL}/transcribe`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
      body: form,
      duplex: "half",
    });

    if (!response.ok) {
      // eslint-disable-next-line no-console
      console.error("API Error:", response.status, await response.text());
      return;
    }

    const data = await response.json();
    // eslint-disable-next-line no-console
    console.log("Transcription result:", data);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Request failed:", err);
  }
}

async function refreshToken() {
  const response = await fetch(`${API_URL}/token`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to refresh the token.");
  }

  const data = await response.json();
  // eslint-disable-next-line no-console
  console.log("Refresh token:", data);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
Promise.all([refreshToken(), sendAudio()]);
