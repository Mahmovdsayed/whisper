import gc
import os
import subprocess
import tempfile
import traceback

os.environ["HF_TOKEN"] = "your_secret_token_here"

import torch
import torchaudio
from faster_whisper import WhisperModel
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from transformers import pipeline

app = FastAPI(title="Audio Analysis API (Stable CPU Version)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

device = "mps" if torch.backends.mps.is_available() else "cpu"
print(f"System has {device} available, but forcing CPU for stability.")

whisper_model = WhisperModel("small", device="cpu", compute_type="int8")
print("Faster‑Whisper (small, int8) loaded on CPU.")

emotion_pipe = pipeline(
    "audio-classification", model="ahmmedasaad2772/wav2vec2-base-arabic_speech_emotion_recognition", device="cpu"
)
print("Arabic Emotion model loaded on CPU.")

MAX_DURATION_SEC = 600

def truncate_audio_if_needed(file_path: str) -> None:
    waveform, sample_rate = torchaudio.load(file_path)
    max_samples = MAX_DURATION_SEC * sample_rate
    if waveform.shape[1] > max_samples:
        waveform = waveform[:, :max_samples]
        torchaudio.save(file_path, waveform, sample_rate)
        print(f"Truncated audio to {MAX_DURATION_SEC} seconds.")

@app.get("/")
async def health_check():
    return {"status": "healthy", "models": "whisper(small,int8) + arabic-wav2vec2-er"}

@app.post("/process-audio")
async def process_audio(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    tmp_path = None

    try:
        _, ext = os.path.splitext(file.filename)
        if not ext:
            ext = ".tmp"

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as upload_tmp:
            upload_tmp.write(await file.read())
            upload_tmp_path = upload_tmp.name

        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as wav_tmp:
            tmp_path = wav_tmp.name

        try:
            cmd = [
                "ffmpeg", "-y",
                "-i", upload_tmp_path,
                "-ar", "16000",
                "-ac", "1",
                "-acodec", "pcm_s16le",
                tmp_path
            ]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            if result.returncode != 0:
                print(f"FFmpeg conversion error: {result.stderr}")
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to decode or convert audio file: {result.stderr}"
                )
        finally:
            if os.path.exists(upload_tmp_path):
                os.remove(upload_tmp_path)

        print(f"Processing: {file.filename}")

        truncate_audio_if_needed(tmp_path)

        segments, info = whisper_model.transcribe(tmp_path, beam_size=5, task="transcribe")
        text = " ".join(seg.text for seg in segments).strip()

        del segments
        gc.collect()

        emotion_result = emotion_pipe(tmp_path)

        formatted_emotions = [
            {"label": e["label"], "score": float(e["score"])} for e in emotion_result
        ]
        top_emotion = max(formatted_emotions, key=lambda x: x["score"])

        print(f"Transcript: {text}")
        print(f"Audio Emotions: {formatted_emotions}")

        response_data = {
            "transcript": text,
            "audio_emotions": formatted_emotions,
            "primary_emotion": {
                "label": top_emotion["label"],
                "score": top_emotion["score"],
            },
        }
        print(f"Transcription result: {text[:100]}...")
        print(f"Primary emotion: {top_emotion['label']} ({top_emotion['score']})")
        return response_data

    except Exception as e:
        print("ERROR:", e)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
        gc.collect()
        if torch.backends.mps.is_available():
            torch.mps.empty_cache()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
