#!/bin/sh
# Pulls the two Ollama models Tapas Kiran needs. Needs internet ONCE; afterwards everything is offline.
#   Docker:   ./scripts/setup-models.sh            (uses the "ollama" container from docker-compose.yml)
#   Host:     OLLAMA_MODE=host ./scripts/setup-models.sh   (uses an Ollama installed on this machine)
# Model names can be overridden: CHAT_MODEL=llama3.1:8b ./scripts/setup-models.sh
set -e
CHAT_MODEL="${CHAT_MODEL:-qwen2.5:7b}"
EMBED_MODEL="${EMBED_MODEL:-bge-m3}"

if [ "$OLLAMA_MODE" = "host" ]; then
  run() { ollama "$@"; }
else
  # `docker compose up -d ollama` must have been run before.
  run() { docker compose exec -T ollama ollama "$@"; }
fi

for m in "$EMBED_MODEL" "$CHAT_MODEL"; do
  echo "Pulling $m ..."
  run pull "$m"
done
echo "Done. Installed models:"
run list
