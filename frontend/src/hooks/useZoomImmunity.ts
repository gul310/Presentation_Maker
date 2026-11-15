import { useState, useEffect, useRef } from 'react';

interface UseZoomImmunityOptions {
  standardWidth?: number;
  standardHeight?: number;
}

/**
 * Custom hook to keep the main presentation block completely immune to browser zoom.
 * When the user zooms the website in or out (Ctrl + / Ctrl - / trackpad pinch / browser zoom menu):
 * - All outer UI elements (sidebars, toolbars, buttons, notes) zoom normally with the browser.
 * - The presentation block cancels out the zoom via an inverse transform scale (1 / Z),
 *   keeping its physical dimensions, text size, images, and layout rock-solid and stable.
 */
export function useZoomImmunity({
  standardWidth = 896,
  standardHeight = 504,
}: UseZoomImmunityOptions = {}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [zoomFactor, setZoomFactor] = useState<number>(1);
  const [baseFit, setBaseFit] = useState<number>(1);
  const baseDprRef = useRef<number>(1);

  useEffect(() => {
    // 1. Establish baseline DPR (Display Pixel Ratio at 100% browser zoom)
    let baseDpr = 1;
    const stored = sessionStorage.getItem('presentai_baseline_dpr');

    if (stored) {
      baseDpr = parseFloat(stored) || 1;
    } else {
      const currentDpr = window.devicePixelRatio || 1;
      const widthRatio =
        window.outerWidth && window.innerWidth ? window.outerWidth / window.innerWidth : 1;

      if (Math.abs(widthRatio - 1) < 0.08) {
        baseDpr = currentDpr;
      } else {
        baseDpr = currentDpr / widthRatio;
      }

      // Snap to common OS scaling steps (1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5) if close
      const commonScales = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5];
      for (const s of commonScales) {
        if (Math.abs(baseDpr - s) < 0.06) {
          baseDpr = s;
          break;
        }
      }

      sessionStorage.setItem('presentai_baseline_dpr', baseDpr.toString());
    }

    baseDprRef.current = baseDpr;

    const updateZoomAndFit = () => {
      // 2. Compute current browser zoom factor Z
      const currentDpr = window.devicePixelRatio || 1;
      let z = currentDpr / baseDprRef.current;

      // Cross-check with outerWidth / innerWidth
      if (window.outerWidth && window.innerWidth && window.innerWidth > 0) {
        const widthZ = window.outerWidth / window.innerWidth;
        if (Math.abs(z - 1) < 0.03 && Math.abs(widthZ - 1) >= 0.08) {
          z = widthZ;
        }
      }

      // Incorporate trackpad pinch-to-zoom if active
      if (window.visualViewport && window.visualViewport.scale && window.visualViewport.scale !== 1) {
        z *= window.visualViewport.scale;
      }

      // Snap near 100% zoom (within 2%) to clean 1.0
      if (Math.abs(z - 1) < 0.02) {
        z = 1;
      }

      setZoomFactor(z);

      // 3. Compute baseline physical fit to ensure slide never exceeds the canvas stage
      if (stageRef.current) {
        const rect = stageRef.current.getBoundingClientRect();
        // Multiply by z to measure available space in physical screen pixels
        const availableW = Math.max(320, rect.width * z - 32);
        const availableH = Math.max(200, rect.height * z - 32);

        const fitW = availableW / standardWidth;
        const fitH = availableH / standardHeight;
        const computedFit = Math.min(1, Math.min(fitW, fitH));
        setBaseFit(Math.max(0.4, computedFit));
      }
    };

    updateZoomAndFit();

    window.addEventListener('resize', updateZoomAndFit);

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateZoomAndFit);
    }

    // Dynamic resolution media query for devicePixelRatio updates
    let mediaQuery: MediaQueryList | null = null;
    let mqHandler: (() => void) | null = null;
    try {
      mediaQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio}dppx)`);
      mqHandler = () => updateZoomAndFit();
      mediaQuery.addEventListener('change', mqHandler);
    } catch {
      // fallback
    }

    return () => {
      window.removeEventListener('resize', updateZoomAndFit);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateZoomAndFit);
      }
      if (mediaQuery && mqHandler) {
        try {
          mediaQuery.removeEventListener('change', mqHandler);
        } catch {}
      }
    };
  }, [standardWidth, standardHeight]);

  const inverseZoom = zoomFactor > 0 ? 1 / zoomFactor : 1;
  const finalScale = baseFit * inverseZoom;

  return {
    stageRef,
    zoomFactor,
    inverseZoom,
    baseFit,
    finalScale,
    standardWidth,
    standardHeight,
    // Outer anchor box: preserves exact layout space inside the DOM
    anchorStyle: {
      width: `${standardWidth * finalScale}px`,
      height: `${standardHeight * finalScale}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'width 0.08s ease-out, height 0.08s ease-out',
    } as React.CSSProperties,
    // Main presentation block: perfectly scaled and immune to zoom
    blockStyle: {
      width: `${standardWidth}px`,
      height: `${standardHeight}px`,
      minWidth: `${standardWidth}px`,
      minHeight: `${standardHeight}px`,
      maxWidth: `${standardWidth}px`,
      maxHeight: `${standardHeight}px`,
      transform: `scale(${finalScale})`,
      transformOrigin: 'center center',
      flexShrink: 0,
      transition: 'transform 0.08s ease-out',
    } as React.CSSProperties,
  };
}

