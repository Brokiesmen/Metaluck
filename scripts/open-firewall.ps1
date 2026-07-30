# Allow inbound connections to minigames dev servers on Private network (Wi-Fi).
# Run as Administrator if rules fail to add.
$rules = @(
  @{ Name = 'Minigames Dev Vite 5173'; Port = 5173 },
  @{ Name = 'Minigames Dev API 3001'; Port = 3001 }
)

foreach ($r in $rules) {
  $existing = Get-NetFirewallRule -DisplayName $r.Name -ErrorAction SilentlyContinue
  if ($existing) {
    Write-Host "OK: rule exists - $($r.Name)"
    continue
  }
  New-NetFirewallRule -DisplayName $r.Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $r.Port -Profile Private | Out-Null
  Write-Host "OK: added - $($r.Name) TCP $($r.Port) Private"
}

Write-Host ""
Write-Host "Done. Open the LAN URL from npm run dev on your phone (same Wi-Fi)."
