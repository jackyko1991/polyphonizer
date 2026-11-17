# The Polyphonizer runner on a server: a VPS (behind HTTPS) or a Hugging Face Docker Space.
#
#   docker build -f runner/Dockerfile -t polyphonizer-runner .        (from the repository's root)
#   docker run -d --restart unless-stopped -e PZ_TOKEN=<a long secret> -p 127.0.0.1:8765:8765 polyphonizer-runner
#
# It reads PDFs and photos of printed music with KobiMusic's copisteria (Apache-2.0; PyTorch on the CPU, ~131 MB of
# weights fetched while building), and recordings with Transkun (piano) and Basic Pitch (other instruments), written as
# a score (engines/audio.py). With an NVIDIA GPU (the NVIDIA Container Toolkit on the host), recordings run on it:
#   docker build -f runner/Dockerfile --build-arg TORCH=cu124 -t polyphonizer-runner:cuda .
#   docker run -d --gpus all -e PZ_TOKEN=<a long secret> -p 127.0.0.1:8765:8765 polyphonizer-runner:cuda It listens on every address inside the container, so it needs PZ_TOKEN: the site
# sends it with each request (Transcribe ▸ address and token). See the site's page AI agent ▸ Runner.
# The AI agent here takes the learner's API key; with PZ_AGENT_KEY (the Polyphonizer service's own key) it also offers
# the agent included with Pro. This computer's own agents (a login) are only offered with PZ_AGENT_AUTH=local.
FROM python:3.12-slim
# PyTorch's build: cpu (much smaller) or a CUDA one (cu124 …) for a GPU server
ARG TORCH=cpu

RUN apt-get update \
 && apt-get install -y --no-install-recommends git poppler-utils libglib2.0-0 ffmpeg \
 && rm -rf /var/lib/apt/lists/*

# PyTorch (the CPU build unless TORCH says otherwise), then what the reader, the page joining and the sound engines need
RUN pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/${TORCH} \
 && pip install --no-cache-dir numpy pillow scipy opencv-python-headless huggingface_hub music21 "claude-agent-sdk>=0.2.176,<0.3" \
    transkun onnxruntime librosa soundfile pretty-midi mir-eval resampy scikit-learn \
 && pip install --no-cache-dir --no-deps basic-pitch==0.4.0

# Hugging Face Spaces run as user 1000; the reader writes its PDF pages beside itself, so the app folder is theirs
RUN useradd -m -u 1000 runner
WORKDIR /app
COPY --chown=runner runner/ runner/
# the AI agent's compile tool runs scores with the site's own prelude
COPY --chown=runner frontend/src/engine/prelude.py frontend/src/engine/prelude.py
USER runner
RUN python runner/engines/setup_copista.py

ENV PZ_HOST=0.0.0.0 PZ_PORT=8765 PYTHONUNBUFFERED=1
EXPOSE 8765
CMD ["python", "runner/server.py"]
