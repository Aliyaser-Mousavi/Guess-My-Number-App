Add-Type -AssemblyName System.Drawing

function Generate-CyberCryptographicAssets {
    param (
        [string]$outputDir = "assets\images"
    )

    # Core Brand Palette
    $baseObsidian     = [System.Drawing.ColorTranslator]::FromHtml("#0A0E1A")
    $deepSpaceNavy    = [System.Drawing.ColorTranslator]::FromHtml("#050811")
    $elevatedNavy     = [System.Drawing.ColorTranslator]::FromHtml("#111A2E")
    $plateFillDark    = [System.Drawing.Color]::FromArgb(235, 10, 16, 30)

    $cyberTeal        = [System.Drawing.ColorTranslator]::FromHtml("#00D2B4")
    $cyberTealGlow    = [System.Drawing.Color]::FromArgb(80, 0, 210, 180)
    $cyberTealSubtle  = [System.Drawing.Color]::FromArgb(25, 0, 210, 180)

    $amberOrange      = [System.Drawing.ColorTranslator]::FromHtml("#FFB800")
    $amberGlow        = [System.Drawing.Color]::FromArgb(85, 255, 184, 0)
    $amberSubtle      = [System.Drawing.Color]::FromArgb(35, 255, 184, 0)

    $whiteCrisp       = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
    $whiteMuted       = [System.Drawing.Color]::FromArgb(180, 240, 248, 255)
    $transparent      = [System.Drawing.Color]::Transparent

    function Setup-Graphics($g) {
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    }

    # 1. Tech-Grid Obsidian Background (Strictly no celestial stars/galaxies)
    function Draw-CyberGridBackground($g, $size) {
        $rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)

        # Gradient obsidian backdrop
        $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
            [System.Drawing.Point]::new(0, 0),
            [System.Drawing.Point]::new($size, $size),
            $deepSpaceNavy,
            $baseObsidian
        )
        $g.FillRectangle($bgBrush, $rect)
        $bgBrush.Dispose()

        # Center subtle cyber glow
        $centerGlowRect = [System.Drawing.RectangleF]::new(($size * 0.15), ($size * 0.15), ($size * 0.70), ($size * 0.70))
        $pathCenter = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $pathCenter.AddEllipse($centerGlowRect)
        $pgbCenter = [System.Drawing.Drawing2D.PathGradientBrush]::new($pathCenter)
        $pgbCenter.CenterColor = [System.Drawing.Color]::FromArgb(40, 0, 210, 180)
        $pgbCenter.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 10, 14, 26))
        $g.FillEllipse($pgbCenter, $centerGlowRect)
        $pgbCenter.Dispose()
        $pathCenter.Dispose()

        # Digital Matrix Grid Lines
        $gridSpacing = $size * 0.08
        $penGrid = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(14, 0, 210, 180), 1)
        for ($pos = $gridSpacing; $pos -lt $size; $pos += $gridSpacing) {
            $g.DrawLine($penGrid, $pos, 0, $pos, $size)
            $g.DrawLine($penGrid, 0, $pos, $size, $pos)
        }
        $penGrid.Dispose()

        # Telemetry node crosshairs on grid corners
        $penCross = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(26, 0, 210, 180), 1)
        $crossLen = $size * 0.012
        for ($x = $gridSpacing * 2; $x -lt $size - ($gridSpacing); $x += $gridSpacing * 2) {
            for ($y = $gridSpacing * 2; $y -lt $size - ($gridSpacing); $y += $gridSpacing * 2) {
                $g.DrawLine($penCross, ($x - $crossLen), $y, ($x + $crossLen), $y)
                $g.DrawLine($penCross, $x, ($y - $crossLen), $x, ($y + $crossLen))
            }
        }
        $penCross.Dispose()
    }

    # 2. Cryptographic "0..?..?" HUD Cipher Emblem
    function Draw-CryptographicCipherPlate($g, $centerX, $centerY, $radius, [bool]$monochrome = $false) {
        $r = $radius

        if ($monochrome) {
            $penWhite = [System.Drawing.Pen]::new($whiteCrisp, ($r * 0.065))
            $penWhite.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
            $penWhite.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

            # Outer Tracking Ring
            $g.DrawEllipse($penWhite, ($centerX - $r * 0.90), ($centerY - $r * 0.90), ($r * 1.80), ($r * 1.80))

            # Bisection Interval Arc
            $penWhiteThin = [System.Drawing.Pen]::new($whiteCrisp, ($r * 0.035))
            $g.DrawArc($penWhiteThin, ($centerX - $r * 0.72), ($centerY - $r * 0.72), ($r * 1.44), ($r * 1.44), 30, 120)
            $g.DrawArc($penWhiteThin, ($centerX - $r * 0.72), ($centerY - $r * 0.72), ($r * 1.44), ($r * 1.44), 210, 120)
            $penWhiteThin.Dispose()

            # Target Lock Corners [ ]
            $bSize = $r * 0.60
            $bLen = $r * 0.22
            $penBracket = [System.Drawing.Pen]::new($whiteCrisp, ($r * 0.075))
            # TL
            $g.DrawLine($penBracket, ($centerX - $bSize), ($centerY - $bSize + $bLen), ($centerX - $bSize), ($centerY - $bSize))
            $g.DrawLine($penBracket, ($centerX - $bSize), ($centerY - $bSize), ($centerX - $bSize + $bLen), ($centerY - $bSize))
            # TR
            $g.DrawLine($penBracket, ($centerX + $bSize - $bLen), ($centerY - $bSize), ($centerX + $bSize), ($centerY - $bSize))
            $g.DrawLine($penBracket, ($centerX + $bSize), ($centerY - $bSize), ($centerX + $bSize), ($centerY - $bSize + $bLen))
            # BL
            $g.DrawLine($penBracket, ($centerX - $bSize), ($centerY + $bSize - $bLen), ($centerX - $bSize), ($centerY + $bSize))
            $g.DrawLine($penBracket, ($centerX - $bSize), ($centerY + $bSize), ($centerX - $bSize + $bLen), ($centerY + $bSize))
            # BR
            $g.DrawLine($penBracket, ($centerX + $bSize - $bLen), ($centerY + $bSize), ($centerX + $bSize), ($centerY + $bSize))
            $g.DrawLine($penBracket, ($centerX + $bSize), ($centerY + $bSize - $bLen), ($centerX + $bSize), ($centerY + $bSize))
            $penBracket.Dispose()

            # Central Cipher Text "0..?..?"
            $fontSize = [Math]::Max(10, [int]($r * 0.38))
            $font = [System.Drawing.Font]::new("Consolas", $fontSize, [System.Drawing.FontStyle]::Bold)
            $sf = [System.Drawing.StringFormat]::new()
            $sf.Alignment = [System.Drawing.StringAlignment]::Center
            $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

            $brushText = [System.Drawing.SolidBrush]::new($whiteCrisp)
            $textRect = [System.Drawing.RectangleF]::new(($centerX - $r * 0.70), ($centerY - $r * 0.35), ($r * 1.40), ($r * 0.70))
            $g.DrawString("0..?..?", $font, $brushText, $textRect, $sf)

            $brushText.Dispose()
            $sf.Dispose()
            $font.Dispose()
            $penWhite.Dispose()
            return
        }

        # --- FULL CYBERNETIC CRYPTOGRAPHIC COLOR HUD ---

        # A. Outer Radial Glow (Teal & Amber Aura)
        $glowRect = [System.Drawing.RectangleF]::new(($centerX - $r * 1.15), ($centerY - $r * 1.15), ($r * 2.30), ($r * 2.30))
        $pathGlow = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $pathGlow.AddEllipse($glowRect)
        $pgbGlow = [System.Drawing.Drawing2D.PathGradientBrush]::new($pathGlow)
        $pgbGlow.CenterColor = [System.Drawing.Color]::FromArgb(65, 0, 210, 180)
        $pgbGlow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 0, 210, 180))
        $g.FillEllipse($pgbGlow, $glowRect)
        $pgbGlow.Dispose()
        $pathGlow.Dispose()

        # B. Central Dark Glass Cipher Plate
        $plateRect = [System.Drawing.RectangleF]::new(($centerX - $r * 0.82), ($centerY - $r * 0.82), ($r * 1.64), ($r * 1.64))
        $brushPlate = [System.Drawing.SolidBrush]::new($plateFillDark)
        $g.FillEllipse($brushPlate, $plateRect)
        $brushPlate.Dispose()

        # C. Primary Cryptographic Calibrated Ring (Segmented neon teal)
        $penTealRing = [System.Drawing.Pen]::new($cyberTeal, ($r * 0.045))
        $penTealRing.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $penTealRing.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        # 4 bisection arcs
        $g.DrawArc($penTealRing, ($centerX - $r * 0.82), ($centerY - $r * 0.82), ($r * 1.64), ($r * 1.64), 10, 70)
        $g.DrawArc($penTealRing, ($centerX - $r * 0.82), ($centerY - $r * 0.82), ($r * 1.64), ($r * 1.64), 100, 70)
        $g.DrawArc($penTealRing, ($centerX - $r * 0.82), ($centerY - $r * 0.82), ($r * 1.64), ($r * 1.64), 190, 70)
        $g.DrawArc($penTealRing, ($centerX - $r * 0.82), ($centerY - $r * 0.82), ($r * 1.64), ($r * 1.64), 280, 70)
        $penTealRing.Dispose()

        # D. Outer Calibrated Telemetry Dial & Degree Ticks
        $penTick = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(160, 0, 210, 180), ($r * 0.02))
        for ($deg = 0; $deg -lt 360; $deg += 15) {
            $rad = $deg * [Math]::PI / 180.0
            $isMajor = ($deg % 45) -eq 0
            $tLen = if ($isMajor) { $r * 0.08 } else { $r * 0.04 }
            $rInner = $r * 0.86
            $rOuter = $rInner + $tLen
            $x1 = $centerX + $rInner * [Math]::Cos($rad)
            $y1 = $centerY + $rInner * [Math]::Sin($rad)
            $x2 = $centerX + $rOuter * [Math]::Cos($rad)
            $y2 = $centerY + $rOuter * [Math]::Sin($rad)
            $g.DrawLine($penTick, $x1, $y1, $x2, $y2)
        }
        $penTick.Dispose()

        # E. Algorithmic Bisection Search Interval Brackets (Amber / Orange)
        # Bounded search range telemetry
        $penAmberBracket = [System.Drawing.Pen]::new($amberOrange, ($r * 0.04))
        $penAmberBracket.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
        $g.DrawArc($penAmberBracket, ($centerX - $r * 0.68), ($centerY - $r * 0.68), ($r * 1.36), ($r * 1.36), 35, 110)
        $g.DrawArc($penAmberBracket, ($centerX - $r * 0.68), ($centerY - $r * 0.68), ($r * 1.36), ($r * 1.36), 215, 110)
        $penAmberBracket.Dispose()

        # Nodes at bisection limits (Active telemetry indicators)
        $brushAmberNode = [System.Drawing.SolidBrush]::new($amberOrange)
        $brushTealNode  = [System.Drawing.SolidBrush]::new($cyberTeal)
        $nodeRad = $r * 0.05
        # Top-Right node (Upper bound)
        $g.FillEllipse($brushAmberNode, ($centerX + $r * 0.62), ($centerY - $r * 0.35), ($nodeRad * 2), ($nodeRad * 2))
        # Bottom-Left node (Lower bound)
        $g.FillEllipse($brushTealNode, ($centerX - $r * 0.70), ($centerY + $r * 0.28), ($nodeRad * 2), ($nodeRad * 2))
        $brushAmberNode.Dispose()
        $brushTealNode.Dispose()

        # F. Tactical Target Lock Brackets [ ]
        $bSize = $r * 0.52
        $bLen  = $r * 0.20
        $penLock = [System.Drawing.Pen]::new($cyberTeal, ($r * 0.065))
        $penLock.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $penLock.EndCap   = [System.Drawing.Drawing2D.LineCap]::Round
        # Top-Left Bracket [
        $g.DrawLine($penLock, ($centerX - $bSize), ($centerY - $bSize + $bLen), ($centerX - $bSize), ($centerY - $bSize))
        $g.DrawLine($penLock, ($centerX - $bSize), ($centerY - $bSize), ($centerX - $bSize + $bLen), ($centerY - $bSize))
        # Top-Right Bracket ]
        $g.DrawLine($penLock, ($centerX + $bSize - $bLen), ($centerY - $bSize), ($centerX + $bSize), ($centerY - $bSize))
        $g.DrawLine($penLock, ($centerX + $bSize), ($centerY - $bSize), ($centerX + $bSize), ($centerY - $bSize + $bLen))
        # Bottom-Left Bracket [
        $g.DrawLine($penLock, ($centerX - $bSize), ($centerY + $bSize - $bLen), ($centerX - $bSize), ($centerY + $bSize))
        $g.DrawLine($penLock, ($centerX - $bSize), ($centerY + $bSize), ($centerX - $bSize + $bLen), ($centerY + $bSize))
        # Bottom-Right Bracket ]
        $g.DrawLine($penLock, ($centerX + $bSize - $bLen), ($centerY + $bSize), ($centerX + $bSize), ($centerY + $bSize))
        $g.DrawLine($penLock, ($centerX + $bSize), ($centerY + $bSize - $bLen), ($centerX + $bSize), ($centerY + $bSize))
        $penLock.Dispose()

        # G. Cryptographic Target Lock Banner / Data Pill "0..?..?"
        $pillW = $r * 1.15
        $pillH = $r * 0.44
        $pillX = $centerX - ($pillW / 2)
        $pillY = $centerY - ($pillH / 2)
        $pillRect = [System.Drawing.RectangleF]::new($pillX, $pillY, $pillW, $pillH)

        # Dark pill container with cyber glow border
        $brushPillBg = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(240, 7, 14, 26))
        $g.FillRectangle($brushPillBg, $pillRect)
        $brushPillBg.Dispose()

        $penPillBorder = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(210, 0, 210, 180), ($r * 0.025))
        $g.DrawRectangle($penPillBorder, $pillX, $pillY, $pillW, $pillH)
        $penPillBorder.Dispose()

        # Top & Bottom Tactical Micro-Rulers for the Pill
        $penPillRuler = [System.Drawing.Pen]::new($amberOrange, ($r * 0.02))
        $g.DrawLine($penPillRuler, ($pillX + $r * 0.1), $pillY, ($pillX + $r * 0.35), $pillY)
        $g.DrawLine($penPillRuler, ($pillX + $pillW - $r * 0.35), ($pillY + $pillH), ($pillX + $pillW - $r * 0.1), ($pillY + $pillH))
        $penPillRuler.Dispose()

        # H. Central Mystery Cipher String: "0..?..?"
        # Font: Consolas / Monospace for true cryptographic code look
        $fontSize = [Math]::Max(10, [int]($r * 0.28))
        $font = [System.Drawing.Font]::new("Consolas", $fontSize, [System.Drawing.FontStyle]::Bold)
        $sf = [System.Drawing.StringFormat]::new()
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center

        # Render layered glow for text
        # Layer 1: Amber/Teal Glow
        $brushGlow = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(90, 0, 210, 180))
        $textGlowRect = [System.Drawing.RectangleF]::new(($pillX - 1), ($pillY - 1), ($pillW + 2), ($pillH + 2))
        $g.DrawString("0..?..?", $font, $brushGlow, $textGlowRect, $sf)
        $brushGlow.Dispose()

        # Layer 2: Ultra Crisp White Core with Neon Teal Shading
        $brushCore = [System.Drawing.SolidBrush]::new($whiteCrisp)
        $g.DrawString("0..?..?", $font, $brushCore, $pillRect, $sf)
        $brushCore.Dispose()

        $sf.Dispose()
        $font.Dispose()

        # I. Header / Footer Micro HUD Telemetry Badges
        $hudFontSize = [Math]::Max(7, [int]($r * 0.075))
        $hudFont = [System.Drawing.Font]::new("Segoe UI", $hudFontSize, [System.Drawing.FontStyle]::Bold)
        $sfHud = [System.Drawing.StringFormat]::new()
        $sfHud.Alignment = [System.Drawing.StringAlignment]::Center
        $sfHud.LineAlignment = [System.Drawing.StringAlignment]::Center

        # Top Header: "CIPHER LOCK // [0..N]"
        $brushHudTeal = [System.Drawing.SolidBrush]::new($cyberTeal)
        $topHudRect = [System.Drawing.RectangleF]::new(($centerX - $r * 0.6), ($centerY - $r * 0.40), ($r * 1.2), ($r * 0.15))
        $g.DrawString("CIPHER LOCK", $hudFont, $brushHudTeal, $topHudRect, $sfHud)
        $brushHudTeal.Dispose()

        # Bottom Footer: "BISECTION SEARCH"
        $brushHudAmber = [System.Drawing.SolidBrush]::new($amberOrange)
        $botHudRect = [System.Drawing.RectangleF]::new(($centerX - $r * 0.6), ($centerY + $r * 0.25), ($r * 1.2), ($r * 0.15))
        $g.DrawString("BISECTION", $hudFont, $brushHudAmber, $botHudRect, $sfHud)
        $brushHudAmber.Dispose()

        $sfHud.Dispose()
        $hudFont.Dispose()
    }

    # ==========================================
    # 1. ICON.PNG (1024x1024, Opaque Master App Icon)
    # ==========================================
    Write-Output "1/6: Generating icon.png (1024x1024)..."
    $iconBmp = [System.Drawing.Bitmap]::new(1024, 1024)
    $g = [System.Drawing.Graphics]::FromImage($iconBmp)
    Setup-Graphics $g
    Draw-CyberGridBackground $g 1024
    Draw-CryptographicCipherPlate $g 512 512 430 $false
    $g.Dispose()
    $iconBmp.Save((Join-Path $outputDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $iconBmp.Dispose()

    # ==========================================
    # 2. SPLASH-ICON.PNG (1024x1024, Transparent, Centered HUD Cipher)
    # ==========================================
    Write-Output "2/6: Generating splash-icon.png (1024x1024)..."
    $splashBmp = [System.Drawing.Bitmap]::new(1024, 1024)
    $g = [System.Drawing.Graphics]::FromImage($splashBmp)
    Setup-Graphics $g
    $g.Clear($transparent)
    Draw-CryptographicCipherPlate $g 512 512 380 $false
    $g.Dispose()
    $splashBmp.Save((Join-Path $outputDir "splash-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $splashBmp.Dispose()

    # ==========================================
    # 3. ANDROID-ICON-FOREGROUND.PNG (1024x1024, Transparent, Safe Zone Padded ~280px radius)
    # ==========================================
    Write-Output "3/6: Generating android-icon-foreground.png (1024x1024)..."
    $fgBmp = [System.Drawing.Bitmap]::new(1024, 1024)
    $g = [System.Drawing.Graphics]::FromImage($fgBmp)
    Setup-Graphics $g
    $g.Clear($transparent)
    # Safe zone radius: 280px
    Draw-CryptographicCipherPlate $g 512 512 280 $false
    $g.Dispose()
    $fgBmp.Save((Join-Path $outputDir "android-icon-foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $fgBmp.Dispose()

    # ==========================================
    # 4. ANDROID-ICON-BACKGROUND.PNG (1024x1024, Obsidian Tech Grid Layer)
    # ==========================================
    Write-Output "4/6: Generating android-icon-background.png (1024x1024)..."
    $bgBmp = [System.Drawing.Bitmap]::new(1024, 1024)
    $g = [System.Drawing.Graphics]::FromImage($bgBmp)
    Setup-Graphics $g
    Draw-CyberGridBackground $g 1024
    $g.Dispose()
    $bgBmp.Save((Join-Path $outputDir "android-icon-background.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bgBmp.Dispose()

    # ==========================================
    # 5. ANDROID-ICON-MONOCHROME.PNG (1024x1024, Transparent, High-Contrast Vector Silhouette)
    # ==========================================
    Write-Output "5/6: Generating android-icon-monochrome.png (1024x1024)..."
    $monoBmp = [System.Drawing.Bitmap]::new(1024, 1024)
    $g = [System.Drawing.Graphics]::FromImage($monoBmp)
    Setup-Graphics $g
    $g.Clear($transparent)
    Draw-CryptographicCipherPlate $g 512 512 280 $true
    $g.Dispose()
    $monoBmp.Save((Join-Path $outputDir "android-icon-monochrome.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $monoBmp.Dispose()

    # ==========================================
    # 6. FAVICON.PNG (192x192, High-Contrast Web Cipher)
    # ==========================================
    Write-Output "6/6: Generating favicon.png (192x192)..."
    $favBmp = [System.Drawing.Bitmap]::new(192, 192)
    $g = [System.Drawing.Graphics]::FromImage($favBmp)
    Setup-Graphics $g
    # Dark rounded plate
    $favRect = [System.Drawing.Rectangle]::new(0, 0, 192, 192)
    $brushFav = [System.Drawing.SolidBrush]::new($baseObsidian)
    $g.FillEllipse($brushFav, $favRect)
    $brushFav.Dispose()
    Draw-CryptographicCipherPlate $g 96 96 82 $false
    $g.Dispose()
    $favBmp.Save((Join-Path $outputDir "favicon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $favBmp.Dispose()

    Write-Output "SUCCESS: All 6 MarsGuess Cryptographic Cyber-HUD branding assets generated!"
}

Generate-CyberCryptographicAssets

