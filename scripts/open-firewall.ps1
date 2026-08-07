# Allow inbound connections to minigames dev servers (Wi-Fi / LAN).
# Run as Administrator:
#   powershell -ExecutionPolicy Bypass -File scripts/open-firewall.ps1
#
# Windows often marks home Wi-Fi as Public — rules must allow Public (or Any).

$rules = @(
  @{ Name = 'Minigames Dev Vite 5173'; Port = 5173 },
  @{ Name = 'Minigames Dev API 3001'; Port = 3001 }
)

foreach ($r in $rules) {
  $existing = Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
  if ($existing) {
    # Ensure profile covers Public Wi-Fi
    try {
      Set-NetFirewallRule -DisplayName $r.Name -Profile Any -Enabled True -ErrorAction Stop
      Write-Host "OK: updated - $($r.Name) (Profile Any)"
    } catch {
      Write-Host "OK: rule exists - $($r.Name) (run as Admin to widen Profile)"
    }
    continue
  }
  New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $r.Port -Profile Any | Out-Null
  Write-Host "OK: added - $($r.Name) TCP $($r.Port) Any"
}

Write-Host ""
Write-Host "Done. Phone (same Wi-Fi): open the LAN URL from npm run dev"
Write-Host "  e.g. http://<pc-ip>:5173/?local=1"
