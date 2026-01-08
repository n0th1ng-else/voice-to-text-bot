import os
import time
import uuid
import shutil
import asyncio
from fastapi import FastAPI, UploadFile, Header, HTTPException, Form
from faster_whisper import WhisperModel

TOKEN_FILE = "/access_token.txt"
TOKEN_COOLDOWN = 3600  # 1 hour

# ===== Global variables =====
ACCESS_TOKEN = None
LAST_RELOAD_TIMESTAMP = 0

# ===== CONFIG (FAIL FAST) =====
MODEL_NAME = os.getenv("WHISPER_MODEL", "small")
if MODEL_NAME not in ("small", "medium"):
    raise RuntimeError("Only small or medium models are allowed for WHISPER_MODEL")

DEVICE = os.getenv("DEVICE", "cpu")
if DEVICE not in ("cpu", "cuda"):
    raise RuntimeError("Only cpu or cuda for DEVICE")

try:
    TIMEOUT = float(os.getenv("RECOGNITION_TIMEOUT", "10"))
except ValueError:
    raise RuntimeError("RECOGNITION_TIMEOUT must be a number (seconds)")

COMPUTE_TYPE = "int8" if DEVICE == "cpu" else "float16"

# ===== Token logic =====
def load_token():
    global ACCESS_TOKEN, LAST_RELOAD_TIMESTAMP
    try:
        with open(TOKEN_FILE) as f:
            ACCESS_TOKEN = f.read().strip()
            LAST_RELOAD_TIMESTAMP = time.time()
            print(f"[Token] Loaded token at {time.ctime(LAST_RELOAD_TIMESTAMP)}")
    except Exception as e:
        print("[Token] Failed to read token file:", e)

# Load token at startup
load_token()

# ===== APP =====
app = FastAPI(title="STT Service")

model = WhisperModel(
    MODEL_NAME,
    device=DEVICE,
    compute_type=COMPUTE_TYPE
)

@app.post("/transcribe")
async def transcribe(
    file: UploadFile,
    language: str = Form(...),
    authorization: str = Header(None)
):
    # ---- AUTH ----
    if not authorization or authorization != f"Bearer {ACCESS_TOKEN}":
        raise HTTPException(status_code=404, detail="Not found")

    tmp_path = f"/tmp/{uuid.uuid4()}.wav"

    try:
        # ---- Save uploaded file ----
        with open(tmp_path, "wb") as f:
            shutil.copyfileobj(file.file, f)

        # ---- Inner function for CPU-bound transcription ----
        async def do_transcribe():
            loop = asyncio.get_event_loop()
            segments, _ = await loop.run_in_executor(
                None,
                lambda: model.transcribe(tmp_path, language=language, vad_filter=True)
            )
            return " ".join(s.text for s in segments).strip()

        # ---- Run with application-level timeout ----
        try:
            text = await asyncio.wait_for(do_transcribe(), timeout=TIMEOUT)
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=408,
                detail={"language": language, "text": ""}
            )

    finally:
        # ---- Always clean up temp file ----
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

    return {
        "language": language,
        "text": text
    }

@app.post("/token")
async def reload_token(authorization: str = Header(None)):
    # ---- AUTH ----
    if not authorization or authorization != f"Bearer {ACCESS_TOKEN}":
        raise HTTPException(status_code=404, detail="Not found")

    global LAST_RELOAD_TIMESTAMP, TOKEN_COOLDOWN
    now = time.time()
    if now - LAST_RELOAD_TIMESTAMP < TOKEN_COOLDOWN:
        return {"status": "cooldown", "last_reload": time.ctime(LAST_RELOAD_TIMESTAMP)}

    load_token()
    return {"status": "success", "last_reload": time.ctime(LAST_RELOAD_TIMESTAMP)}

@app.get("/health")
async def get_token():
    return {"status": "success"}