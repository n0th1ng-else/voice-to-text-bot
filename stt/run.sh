# Build
docker build -t stt-whisper .

# Run manually
docker run -d \
  -v $(pwd)/access_token.txt:/access_token.txt:ro \
  -e WHISPER_MODEL=small \
  -e DEVICE=cpu \
  -e RECOGNITION_TIMEOUT=12 \
  -p 8087:8000 \
  stt-whisper

# Run docker compose
docker-compose up -d