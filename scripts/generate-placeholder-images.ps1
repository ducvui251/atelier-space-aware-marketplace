# Generates deterministic gradient placeholder imagery for the Gateway demo
# experience (ADR 0001 D7). The output is committed to
# apps/web-gateway/public/img so builds and demos never depend on a remote
# placeholder service. Re-run only when adding a new named slot; the output
# for an existing slot is always byte-stable for the same size/color inputs.
#
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/generate-placeholder-images.ps1
# Requires: .NET Framework System.Drawing (Windows).
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$outDir = Join-Path $PSScriptRoot "..\apps\web-gateway\public\img"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Palette slots: name, width, height, top color, bottom color, accent overlay color.
# Colors echo the editorial palette of the site (clay, bone, sage, oxblood, ink).
$slots = @(
  @{ name = "art-01";       w = 900;  h = 1100; top = "#c9b8a3"; bottom = "#8a7a66"; accent = "#b3552f" },
  @{ name = "art-02";       w = 1100; h = 780;  top = "#b05a34"; bottom = "#3d3a35"; accent = "#d9a05b" },
  @{ name = "art-03";       w = 900;  h = 1100; top = "#d8cfc0"; bottom = "#9aa58c"; accent = "#7c6f5f" },
  @{ name = "art-04";       w = 1100; h = 780;  top = "#b8b2a6"; bottom = "#6e6a60"; accent = "#8c8577" },
  @{ name = "art-05";       w = 1000; h = 1000; top = "#31393b"; bottom = "#5d6660"; accent = "#97a08c" },
  @{ name = "art-06";       w = 900;  h = 1100; top = "#b23a2a"; bottom = "#4a3a33"; accent = "#d8cfc0" },
  @{ name = "art-07";       w = 1100; h = 780;  top = "#9aa5a8"; bottom = "#5a6468"; accent = "#c4ccd0" },
  @{ name = "art-08";       w = 1000; h = 1000; top = "#4b4741"; bottom = "#2b2926"; accent = "#8c6a44" },
  @{ name = "art-09";       w = 1100; h = 780;  top = "#6e2a28"; bottom = "#241f1e"; accent = "#d8c7ae" },
  @{ name = "art-10";       w = 900;  h = 1100; top = "#33415c"; bottom = "#1d2536"; accent = "#7a4a3a" },
  @{ name = "art-11";       w = 1100; h = 780;  top = "#aeb6b8"; bottom = "#7d868a"; accent = "#5d6668" },
  @{ name = "art-12";       w = 900;  h = 1100; top = "#e2e0da"; bottom = "#b8bcc0"; accent = "#8a9598" },
  @{ name = "artist-lena";  w = 800;  h = 1000; top = "#c2b2a0"; bottom = "#8a7263"; accent = "#4a4038" },
  @{ name = "artist-aki";   w = 800;  h = 1000; top = "#b8b09c"; bottom = "#5d5848"; accent = "#8c7a5f" },
  @{ name = "artist-maria"; w = 800;  h = 1000; top = "#a8a29a"; bottom = "#66625c"; accent = "#3d3a35" },
  @{ name = "artist-ivan";  w = 800;  h = 1000; top = "#cbbfae"; bottom = "#94826e"; accent = "#5d5548" },
  @{ name = "artist-rakim"; w = 800;  h = 1000; top = "#7a6a5c"; bottom = "#3d352d"; accent = "#b3552f" },
  @{ name = "artist-sara";  w = 800;  h = 1000; top = "#ccd2d4"; bottom = "#8e9a9e"; accent = "#5a6a70" },
  @{ name = "room-living";  w = 1400; h = 900;  top = "#d6cdbf"; bottom = "#a89a86"; accent = "#b3a48e" },
  @{ name = "room-bedroom"; w = 1400; h = 900;  top = "#cfc6bc"; bottom = "#9a9086"; accent = "#7d756b" },
  @{ name = "room-dining";  w = 1400; h = 900;  top = "#c9b8a3"; bottom = "#8a7a66"; accent = "#6e5f4e" },
  @{ name = "room-office";  w = 1400; h = 900;  top = "#b8b2a6"; bottom = "#7a756b"; accent = "#5d584e" },
  @{ name = "room-hallway"; w = 1400; h = 900;  top = "#c2bcae"; bottom = "#8e887a"; accent = "#6e6a5e" },
  @{ name = "col-warm";     w = 1100; h = 780;  top = "#e0cdb2"; bottom = "#b39a7a"; accent = "#c97a4a" },
  @{ name = "col-oxblood";  w = 1100; h = 780;  top = "#6e2a28"; bottom = "#3a1a1a"; accent = "#a86a4a" },
  @{ name = "col-still";    w = 1100; h = 780;  top = "#d8cfc0"; bottom = "#9aa58c"; accent = "#7c6f5f" },
  @{ name = "col-shadow";   w = 900;  h = 1100; top = "#4b4741"; bottom = "#1d1c1a"; accent = "#8c8577" },
  @{ name = "editorial-1";  w = 1000; h = 750;  top = "#c9b8a3"; bottom = "#5d5548"; accent = "#8a7a66" },
  @{ name = "space-teaser"; w = 1600; h = 900;  top = "#b8a58c"; bottom = "#4a4038"; accent = "#c97a4a" }
)

function Convert-HexToRgb([string]$hex) {
  $hex = $hex.TrimStart("#")
  return @([Convert]::ToInt32($hex.Substring(0, 2), 16), [Convert]::ToInt32($hex.Substring(2, 2), 16), [Convert]::ToInt32($hex.Substring(4, 2), 16))
}

foreach ($slot in $slots) {
  $w = [int]$slot.w; $h = [int]$slot.h
  $top = Convert-HexToRgb $slot.top
  $bottom = Convert-HexToRgb $slot.bottom
  $accent = Convert-HexToRgb $slot.accent

  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  try {
    # Vertical gradient from top to bottom color, with a soft diagonal
    # accent band to suggest artwork texture without representing one.
    for ($y = 0; $y -lt $h; $y++) {
      $t = $y / [Math]::Max(1, $h - 1)
      $r = [int]($top[0] + ($bottom[0] - $top[0]) * $t)
      $g = [int]($top[1] + ($bottom[1] - $top[1]) * $t)
      $b = [int]($top[2] + ($bottom[2] - $top[2]) * $t)
      $lineColor = [System.Drawing.Color]::FromArgb(255, $r, $g, $b)
      for ($x = 0; $x -lt $w; $x++) {
        # Accent band along the lower-left diagonal.
        $d = ($x / $w + $y / $h) / 2
        if ($d -gt 0.62 -and $d -lt 0.74) {
          $a = 0.35 * (1 - [Math]::Abs(($d - 0.68) / 0.06))
          $blend = [Math]::Min(1, $a)
          $rr = [int]($r + ($accent[0] - $r) * $blend)
          $gg = [int]($g + ($accent[1] - $g) * $blend)
          $bb = [int]($b + ($accent[2] - $b) * $blend)
          $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(255, $rr, $gg, $bb))
        } else {
          $bmp.SetPixel($x, $y, $lineColor)
        }
      }
    }
    $outPath = Join-Path $outDir ("{0}.jpg" -f $slot.name)
    $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
    $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]82)
    $bmp.Save($outPath, $codec, $params)
    Write-Host "wrote $outPath"
  } finally {
    $bmp.Dispose()
  }
}
