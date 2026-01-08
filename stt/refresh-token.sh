#!/bin/bash

# List all STT worker URLs
WORKERS=(
  "http://stt_worker1:8000/reload-token"
  "http://stt_worker2:8000/reload-token"
)

# Loop through each worker and trigger reload
for url in "${WORKERS[@]}"; do
  echo "Reloading token on $url"
  response=$(curl -s -X POST "$url")
  echo "Response: $response"
done
