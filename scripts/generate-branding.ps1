Add-Type -AssemblyName System.Drawing

function Create-MarsGuessAssets {
    param (
        [string]$outputDir = "assets\images"
    )

    $navyBg = [System.Drawing.ColorTranslator]::FromHtml("#0A0E1A")
    $navyBgElevated = [System.Drawing.ColorTranslator]::FromHtml("#111827")
    $tealPrimary = [System.Drawing.ColorTranslator]::FromHtml("#00D2B4")
    $amberMars = [System.Drawing.ColorTranslator]::FromHtml("#FFB800")
    $coralAccent = [System.Drawing.ColorTranslator]::FromHtml("#FF5C72")
    $white = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
    $transparent = [System.Drawing.Color]::Transparent

    function Configure-Graphics($g) {
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    }

    function Draw-CosmicBackground($g, $size) {
        $rect = [System.Drawing.Rectangle]::new(0, 0, $size, $size)
        $brush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
            [System.Drawing.Point]::new(0, 0),
            [System.Drawing.Point]::new($size, $size),
            [System.Drawing.ColorTranslator]::FromHtml("#060912"),
            [System.Drawing.ColorTranslator]::FromHtml("#0E1528")
        )
        $g.FillRectangle($brush, $rect)
        $brush.Dispose()

        # Cosmic telemetry rings
        $penGrid = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(24, 0, 210, 180), ($size * 0.002))
        $penGrid.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
        $center = $size / 2
        $g.DrawEllipse($penGrid, ($center - $size * 0.42), ($center - $size * 0.42), ($size * 0.84), ($size * 0.84))
        $g.DrawEllipse($penGrid, ($center - $size * 0.35), ($center - $size * 0.35), ($size * 0.70), ($size * 0.70))
        $penGrid.Dispose()

        # Mars atmospheric glow
        $marsGlowRect = [System.Drawing.RectangleF]::new(($size * 0.2), ($size * 0.15), ($size * 0.65), ($size * 0.65))
        $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $path.AddEllipse($marsGlowRect)
        $pgb = [System.Drawing.Drawing2D.PathGradientBrush]::new($path)
        $pgb.CenterColor = [System.Drawing.Color]::FromArgb(45, 255, 120, 40)
        $pgb.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 10, 14, 26))
        $g.FillEllipse($pgb, $marsGlowRect)
        $pgb.Dispose()
        $path.Dispose()
    }

    function Draw-Emblem($g, $centerX, $centerY, $radius, [bool]$monochrome = $false) {
        $r = $radius

        if ($monochrome) {
            $pWhite = [System.Drawing.Color]::White
            $penBold = [System.Drawing.Pen]::new($pWhite, ($r * 0.07))
            $penBold.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
            $penBold.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

            # Outer ring
            $g.DrawEllipse($penBold, ($centerX - $r * 0.88), ($centerY - $r * 0.88), ($r * 1.76), ($r * 1.76))

            # Inner secondary ring
            $penMid = [System.Drawing.Pen]::new($pWhite, ($r * 0.045))
            $g.DrawEllipse($penMid, ($centerX - $r * 0.65), ($centerY - $r * 0.65), ($r * 1.30), ($r * 1.30))
            $penMid.Dispose()

            # Central Planet silhouette
            $brushSolid = [System.Drawing.SolidBrush]::new($pWhite)
            $g.FillEllipse($brushSolid, ($centerX - $r * 0.38), ($centerY - $r * 0.38), ($r * 0.76), ($r * 0.76))
            $brushSolid.Dispose()

            # Cardinal reticle ticks
            $penTick = [System.Drawing.Pen]::new($pWhite, ($r * 0.08))
            $penTick.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
            $penTick.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
            $g.DrawLine($penTick, $centerX, ($centerY - $r * 1.05), $centerX, ($centerY - $r * 0.78))
            $g.DrawLine($penTick, $centerX, ($centerY + $r * 0.78), $centerX, ($centerY + $r * 1.05))
            $g.DrawLine($penTick, ($centerX - $r * 1.05), $centerY, ($centerX - $r * 0.78), $centerY)
            $g.DrawLine($penTick, ($centerX + $r * 0.78), $centerY, ($centerX + $r * 1.05), $centerY)
            $penTick.Dispose()

            # Orbital bisection arc
            $penOrbit = [System.Drawing.Pen]::new($pWhite, ($r * 0.05))
            $g.DrawArc($penOrbit, ($centerX - $r * 0.98), ($centerY - $r * 0.40), ($r * 1.96), ($r * 0.80), 25, 130)
            $g.DrawArc($penOrbit, ($centerX - $r * 0.98), ($centerY - $r * 0.40), ($r * 1.96), ($r * 0.80), 205, 130)
            $penOrbit.Dispose()
            $penBold.Dispose()
            return
        }

        # --- FULL COLOR EMBLEM ---

        # 1. Subtle Outer Glow
        $glowRect = [System.Drawing.RectangleF]::new(($centerX - $r * 1.15), ($centerY - $r * 1.15), ($r * 2.3), ($r * 2.3))
        $pathGlow = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $pathGlow.AddEllipse($glowRect)
        $pgbGlow = [System.Drawing.Drawing2D.PathGradientBrush]::new($pathGlow)
        $pgbGlow.CenterColor = [System.Drawing.Color]::FromArgb(85, 0, 210, 180)
        $pgbGlow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 0, 210, 180))
        $g.FillEllipse($pgbGlow, $glowRect)
        $pgbGlow.Dispose()
        $pathGlow.Dispose()

        # 2. Outer Binary / Target Reticle Arc (Neon Teal)
        $penTealRing = [System.Drawing.Pen]::new($tealPrimary, ($r * 0.055))
        $penTealRing.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $penTealRing.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $g.DrawArc($penTealRing, ($centerX - $r * 0.88), ($centerY - $r * 0.88), ($r * 1.76), ($r * 1.76), 15, 60)
        $g.DrawArc($penTealRing, ($centerX - $r * 0.88), ($centerY - $r * 0.88), ($r * 1.76), ($r * 1.76), 105, 60)
        $g.DrawArc($penTealRing, ($centerX - $r * 0.88), ($centerY - $r * 0.88), ($r * 1.76), ($r * 1.76), 195, 60)
        $g.DrawArc($penTealRing, ($centerX - $r * 0.88), ($centerY - $r * 0.88), ($r * 1.76), ($r * 1.76), 285, 60)
        $penTealRing.Dispose()

        # 3. Intermediate Calibrated Angle Ring (Warm Amber & Dots)
        $penAmber = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(140, 255, 184, 0), ($r * 0.025))
        $penAmber.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dot
        $g.DrawEllipse($penAmber, ($centerX - $r * 0.70), ($centerY - $r * 0.70), ($r * 1.40), ($r * 1.40))
        $penAmber.Dispose()

        # 4. Planetary Mars Body (Radial gradient from Warm Amber/Coral to Deep Crimson)
        $planetRect = [System.Drawing.RectangleF]::new(($centerX - $r * 0.44), ($centerY - $r * 0.44), ($r * 0.88), ($r * 0.88))
        $pathPlanet = [System.Drawing.Drawing2D.GraphicsPath]::new()
        $pathPlanet.AddEllipse($planetRect)
        $pgbPlanet = [System.Drawing.Drawing2D.PathGradientBrush]::new($pathPlanet)
        $pgbPlanet.CenterPoint = [System.Drawing.PointF]::new(($centerX - $r * 0.12), ($centerY - $r * 0.12))
        $pgbPlanet.CenterColor = [System.Drawing.ColorTranslator]::FromHtml("#FFA726")
        $pgbPlanet.SurroundColors = @([System.Drawing.ColorTranslator]::FromHtml("#8A1C14"))
        $g.FillEllipse($pgbPlanet, $planetRect)
        $pgbPlanet.Dispose()
        $pathPlanet.Dispose()

        # Mars Atmosphere Rim Light
        $penAtmosphere = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(190, 255, 140, 90), ($r * 0.02))
        $g.DrawEllipse($penAtmosphere, $planetRect)
        $penAtmosphere.Dispose()

        # Mars Surface Feature
        $penTopo = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(60, 255, 255, 255), ($r * 0.025))
        $g.DrawArc($penTopo, ($centerX - $r * 0.40), ($centerY - $r * 0.28), ($r * 0.80), ($r * 0.50), 30, 120)
        $penTopo.Dispose()

        # 5. Planetary Orbit / Binary Halving Ring
        $state = $g.Save()
        $g.TranslateTransform($centerX, $centerY)
        $g.RotateTransform(-28)
        $penOrbit = [System.Drawing.Pen]::new($tealPrimary, ($r * 0.04))
        $penOrbit.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $penOrbit.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $g.DrawArc($penOrbit, (-$r * 0.95), (-$r * 0.36), ($r * 1.90), ($r * 0.72), 350, 180)
        $penOrbit.Dispose()

        $penOrbitBack = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(100, 0, 210, 180), ($r * 0.025))
        $penOrbitBack.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
        $g.DrawArc($penOrbitBack, (-$r * 0.95), (-$r * 0.36), ($r * 1.90), ($r * 0.72), 170, 180)
        $penOrbitBack.Dispose()

        # Satellites
        $brushBeacon = [System.Drawing.SolidBrush]::new($tealPrimary)
        $g.FillEllipse($brushBeacon, ($r * 0.88), (-$r * 0.04), ($r * 0.12), ($r * 0.12))
        $brushBeacon.Dispose()

        $brushBeacon2 = [System.Drawing.SolidBrush]::new($amberMars)
        $g.FillEllipse($brushBeacon2, (-$r * 0.95), (-$r * 0.04), ($r * 0.09), ($r * 0.09))
        $brushBeacon2.Dispose()
        $g.Restore($state)

        # 6. Central Oracle Targeting Reticle & Cipher Clues
        $penReticle = [System.Drawing.Pen]::new($white, ($r * 0.065))
        $penReticle.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $penReticle.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
        $tickLen = $r * 0.18
        $g.DrawLine($penReticle, $centerX, ($centerY - $r * 0.98), $centerX, ($centerY - $r * 0.98 + $tickLen))
        $g.DrawLine($penReticle, $centerX, ($centerY + $r * 0.98), $centerX, ($centerY + $r * 0.98 - $tickLen))
        $g.DrawLine($penReticle, ($centerX - $r * 0.98), $centerY, ($centerX - $r * 0.98 + $tickLen), $centerY)
        $g.DrawLine($penReticle, ($centerX + $r * 0.98), $centerY, ($centerX + $r * 0.98 - $tickLen), $centerY)
        $penReticle.Dispose()

        # 7. Center Diamond Reticle Focus (The Oracle Eye)
        $penDiamond = [System.Drawing.Pen]::new($white, ($r * 0.035))
        $dSize = $r * 0.14
        $diamondPoints = @(
            [System.Drawing.PointF]::new($centerX, ($centerY - $dSize)),
            [System.Drawing.PointF]::new(($centerX + $dSize), $centerY),
            [System.Drawing.PointF]::new($centerX, ($centerY + $dSize)),
            [System.Drawing.PointF]::new(($centerX - $dSize), $centerY)
        )
        $brushDiamond = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(210, 0, 210, 180))
        $g.FillPolygon($brushDiamond, $diamondPoints)
        $brushDiamond.Dispose()
        $g.DrawPolygon($penDiamond, $diamondPoints)
        $penDiamond.Dispose()

        # Micro Oracle Core Dot
        $brushCore = [System.Drawing.SolidBrush]::new($white)
        $cSize = $r * 0.05
        $g.FillEllipse($brushCore, ($centerX - $cSize / 2), ($centerY - $cSize / 2), $cSize, $cSize)
        $brushCore.Dispose()
    }

    # ==========================================
    # 1. ICON.PNG (1024x1024)
    # ==========================================
    Write-Output "Generating icon.png (1024x1024)..."
    $iconBmp = [System.Drawing.Bitmap]::new(1024, 1024)
    $g = [System.Drawing.Graphics]::FromImage($iconBmp)
    Configure-Graphics $g
    Draw-CosmicBackground $g 1024
    Draw-Emblem $g 512 512 420 $false
    $g.Dispose()
    $iconBmp.Save((Join-Path $outputDir "icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $iconBmp.Dispose()

    # ==========================================
    # 2. SPLASH-ICON.PNG (1024x1024)
    # ==========================================
    Write-Output "Generating splash-icon.png (1024x1024)..."
    $splashBmp = [System.Drawing.Bitmap]::new(1024, 1024)
    $g = [System.Drawing.Graphics]::FromImage($splashBmp)
    Configure-Graphics $g
    $g.Clear($transparent)
    Draw-Emblem $g 512 512 360 $false
    $g.Dispose()
    $splashBmp.Save((Join-Path $outputDir "splash-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $splashBmp.Dispose()

    # ==========================================
    # 3. ANDROID-ICON-FOREGROUND.PNG (1024x1024)
    # ==========================================
    Write-Output "Generating android-icon-foreground.png (1024x1024)..."
    $fgBmp = [System.Drawing.Bitmap]::new(1024, 1024)
    $g = [System.Drawing.Graphics]::FromImage($fgBmp)
    Configure-Graphics $g
    $g.Clear($transparent)
    Draw-Emblem $g 512 512 280 $false
    $g.Dispose()
    $fgBmp.Save((Join-Path $outputDir "android-icon-foreground.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $fgBmp.Dispose()

    # ==========================================
    # 4. ANDROID-ICON-BACKGROUND.PNG (1024x1024)
    # ==========================================
    Write-Output "Generating android-icon-background.png (1024x1024)..."
    $bgBmp = [System.Drawing.Bitmap]::new(1024, 1024)
    $g = [System.Drawing.Graphics]::FromImage($bgBmp)
    Configure-Graphics $g
    Draw-CosmicBackground $g 1024
    $g.Dispose()
    $bgBmp.Save((Join-Path $outputDir "android-icon-background.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $bgBmp.Dispose()

    # ==========================================
    # 5. ANDROID-ICON-MONOCHROME.PNG (1024x1024)
    # ==========================================
    Write-Output "Generating android-icon-monochrome.png (1024x1024)..."
    $monoBmp = [System.Drawing.Bitmap]::new(1024, 1024)
    $g = [System.Drawing.Graphics]::FromImage($monoBmp)
    Configure-Graphics $g
    $g.Clear($transparent)
    Draw-Emblem $g 512 512 280 $true
    $g.Dispose()
    $monoBmp.Save((Join-Path $outputDir "android-icon-monochrome.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $monoBmp.Dispose()

    # ==========================================
    # 6. FAVICON.PNG (48x48)
    # ==========================================
    Write-Output "Generating favicon.png (48x48)..."
    $favBmp = [System.Drawing.Bitmap]::new(48, 48)
    $g = [System.Drawing.Graphics]::FromImage($favBmp)
    Configure-Graphics $g
    $favRect = [System.Drawing.Rectangle]::new(0, 0, 48, 48)
    $brushFav = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml("#0A0E1A"))
    $g.FillEllipse($brushFav, $favRect)
    $brushFav.Dispose()
    Draw-Emblem $g 24 24 19 $false
    $g.Dispose()
    $favBmp.Save((Join-Path $outputDir "favicon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
    $favBmp.Dispose()

    Write-Output "SUCCESS: All 6 MarsGuess branding assets generated!"
}

Create-MarsGuessAssets
