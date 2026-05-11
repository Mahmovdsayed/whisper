import gc
import os
import tempfile
import traceback

os.environ["HF_TOKEN"] = ""

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

whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
print("Faster‑Whisper (tiny, int8) loaded on CPU.")

emotion_pipe = pipeline(
    "audio-classification", model="superb/wav2vec2-base-superb-er", device="cpu"
)
print("Emotion model loaded on CPU.")

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
    return {"status": "healthy", "models": "whisper(tiny,int8) + wav2vec2-er"}

@app.post("/process-audio")
async def process_audio(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp_file:
            tmp_file.write(await file.read())
            tmp_path = tmp_file.name

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
