# Pulls the two Ollama models Tapas Kiran needs. Needs internet ONCE; afterwards everything is offline.
#   Docker: .\scripts\setup-models.ps1            (uses the "ollama" container from docker-compose.yml)
#   Host:   .\scripts\setup-models.ps1 -Host      (uses an Ollama installed on this machine)
param(
  [switch]$Host,
  [string]$ChatModel = "qwen2.5:7b",
  [string]$EmbedModel = "bge-m3"
)

foreach ($m in $EmbedModel, $ChatModel) {
  Write-Host "Pulling $m ..."
  if ($Host) { ollama pull $m } else { docker compose exec -T ollama ollama pull $m }
}
Write-Host "Done. Installed models:"
if ($Host) { ollama list } else { docker compose exec -T ollama ollama list }
