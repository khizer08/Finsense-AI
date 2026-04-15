"""
FinSense AI — Whisper Transcription Service
FastAPI + OpenAI Whisper

Endpoints:
  POST /transcribe   — accepts audio file, returns transcript + metadata
  GET  /health       — health check
"""

import os
import tempfile
import time
import logging
from pathlib import Path

import whisper
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("finsense-ai")

# ─── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="FinSense AI — Whisper Service",
    description="Speech-to-text transcription for FinSense AI",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Model loading ────────────────────────────────────────────────────────────
# Options: tiny, base, small, medium, large
# "base" gives a good speed/accuracy balance on CPU.
# Use "medium" or "large" if you have a GPU.
MODEL_SIZE = os.getenv("WHISPER_MODEL", "base")

logger.info(f"Loading Whisper model: {MODEL_SIZE} ...")
model = whisper.load_model(MODEL_SIZE)
logger.info("Whisper model loaded ✅")

# ─── Allowed audio extensions ─────────────────────────────────────────────────
ALLOWED_EXTENSIONS = {".mp3", ".mp4", ".m4a", ".wav", ".ogg", ".webm", ".flac"}

# ─── Response model ───────────────────────────────────────────────────────────
class TranscribeResponse(BaseModel):
    transcript: str
    language: str
    duration: float        # seconds
    processing_time: float # seconds taken by Whisper


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE}


@app.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(file: UploadFile = File(...)):
    """
    Accept an audio file and return its transcript.
    Whisper automatically detects the language.
    """
    # Validate extension
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {suffix}. Allowed: {ALLOWED_EXTENSIONS}",
        )

    # Write upload to a temp file (Whisper needs a file path)
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp_path = tmp.name
        content = await file.read()
        tmp.write(content)

    try:
        logger.info(f"Transcribing file: {file.filename} ({len(content)/1024:.1f} KB)")
        t0 = time.time()

        result = model.transcribe(
            tmp_path,
            fp16=False,           # disable FP16 for CPU compatibility
            verbose=False,
        )

        processing_time = round(time.time() - t0, 2)
        transcript = result.get("text", "").strip()
        language = result.get("language", "en")

        # Approximate duration from segments
        segments = result.get("segments", [])
        duration = round(segments[-1]["end"], 2) if segments else 0.0

        logger.info(
            f"Done: {len(transcript)} chars | lang={language} | "
            f"duration={duration}s | took={processing_time}s"
        )

        return TranscribeResponse(
            transcript=transcript,
            language=language,
            duration=duration,
            processing_time=processing_time,
        )

    except Exception as e:
        logger.error(f"Transcription error: {e}")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

    finally:
        # Always clean up temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ─── Entry point ──────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
