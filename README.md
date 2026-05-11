# Vocalize AI | Advanced Call Intelligence

Vocalize AI is a powerful, local-first web application designed to extract deep intelligence from audio conversations. It combines state-of-the-art speech-to-text, emotion detection, and LLM-powered insights into a seamless, beautiful dashboard.

## 🚀 Features

- **Transcription**: High-speed, local transcription using `faster-whisper`.
- **Emotion Detection**: Real-time analysis of audio signals to detect primary emotions (Happy, Angry, Sad, etc.) using `wav2vec2`.
- **AI Intelligence**: Deep conversational analysis powered by Google Gemini, including:
  - Automated Summarization
  - Sentiment Analysis
  - Topic Extraction
  - Interaction Quality Metrics
  - Psychological Insights (Tone, Engagement, Confidence)
- **Premium UI**: A sleek, modern dark-mode interface with glassmorphism and smooth animations.

---

## 🛠️ Technology Stack

### Backend
- **Node.js (Orchestrator)**: Built with [Hono](https://hono.dev/) and running on [Bun](https://bun.sh/).
- **Python (ML Engine)**: Built with [FastAPI](https://fastapi.tiangolo.com/).
- **AI Engine**: [Vercel AI SDK](https://sdk.vercel.ai/) with Google Gemini 1.5 Flash.

### Machine Learning Models
- **Speech-to-Text**: `faster-whisper` (Tiny/Int8) for optimized CPU performance.
- **Emotion Classification**: `superb/wav2vec2-base-superb-er`.

### Frontend
- **Vanilla JS/CSS/HTML**: Clean, responsive design without heavy frameworks.

---

## ⚙️ Installation & Setup

### 1. Prerequisites
- **Bun**: [Install Bun](https://bun.sh/)
- **Python 3.10+**
- **FFmpeg**: Required for audio processing.

### 2. Environment Variables
Create a `.env.local` file in the root directory:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
HF_TOKEN=your_huggingface_token
```

### 3. Python Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate

# Install dependencies
pip install fastapi uvicorn faster-whisper transformers torch torchaudio python-multipart soundfile
```

### 4. Node.js Frontend Setup
```bash
# Install dependencies
bun install
```

---

## 🏃 How to Run

### Start the Python ML Server
```bash
source venv/bin/activate
python main.py
```
*The Python server runs on `http://localhost:8000`.*

### Start the Web Server
In a new terminal:
```bash
bun run dev
```
*The web app will be available at `http://localhost:3000`.*

---

## 📄 License
MIT
