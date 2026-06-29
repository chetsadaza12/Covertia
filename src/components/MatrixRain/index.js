import React, { useEffect, useRef, useCallback } from 'react';
import styles from './styles.module.css';

const BINARY = '01';

export default function MatrixRain() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const layersRef = useRef([]);
  const charsRef = useRef(null); // persistent character grid

  const initLayers = useCallback((canvas) => {
    const layers = [];

    // Background layer: small, dim
    const bgFontSize = 14;
    const bgCols = Math.floor(canvas.width / bgFontSize);
    const bgRows = Math.ceil(canvas.height / bgFontSize);
    layers.push({
      fontSize: bgFontSize,
      columns: bgCols,
      drops: Array.from({ length: bgCols }, () => bgRows + Math.random() * 60),
      speeds: Array.from({ length: bgCols }, () => 0.1 + Math.random() * 0.15),
      headColor: 'rgba(160, 160, 160, 0.9)',
    });

    // Middle layer: medium
    const mdFontSize = 26;
    const mdCols = Math.floor(canvas.width / mdFontSize);
    const mdRows = Math.ceil(canvas.height / mdFontSize);
    layers.push({
      fontSize: mdFontSize,
      columns: mdCols,
      drops: Array.from({ length: mdCols }, () => mdRows + Math.random() * 40),
      speeds: Array.from({ length: mdCols }, () => 0.15 + Math.random() * 0.2),
      headColor: 'rgba(200, 200, 200, 1)',
    });

    // Foreground layer: large, bright
    const fgFontSize = 50;
    const fgCols = Math.floor(canvas.width / fgFontSize);
    const fgRows = Math.ceil(canvas.height / fgFontSize);
    layers.push({
      fontSize: fgFontSize,
      columns: fgCols,
      drops: Array.from({ length: fgCols }, () => fgRows + Math.random() * 20),
      speeds: Array.from({ length: fgCols }, () => 0.08 + Math.random() * 0.12),
      headColor: '#ffffff',
    });

    // Pre-generate persistent characters for each layer/column/trail
    const trailLen = 12;
    const chars = layers.map((layer) =>
      Array.from({ length: layer.columns }, () =>
        Array.from({ length: trailLen }, () =>
          BINARY[Math.floor(Math.random() * BINARY.length)]
        )
      )
    );
    charsRef.current = chars;

    layersRef.current = layers;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let frameCount = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      canvas.width = parent.offsetWidth;
      canvas.height = parent.offsetHeight;
      initLayers(canvas);
    };

    resize();
    window.addEventListener('resize', resize);

    const trailLen = 12;

    const draw = () => {
      frameCount++;

      // Clear canvas fully each frame with solid black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.shadowBlur = 0;
      ctx.shadowColor = 'transparent';

      // Slowly swap characters every ~10 frames (~0.17s at 60fps)
      const shouldSwap = frameCount % 3 === 0;

      for (let li = 0; li < layersRef.current.length; li++) {
        const layer = layersRef.current[li];
        ctx.font = `${layer.fontSize}px monospace`;

        for (let i = 0; i < layer.columns; i++) {
          const x = i * layer.fontSize;
          const baseY = layer.drops[i] * layer.fontSize;

          // Randomly swap one character in this column's trail
          if (shouldSwap && charsRef.current) {
            const swapIdx = Math.floor(Math.random() * trailLen);
            charsRef.current[li][i][swapIdx] =
              BINARY[Math.floor(Math.random() * BINARY.length)];
          }

          for (let t = 0; t < trailLen; t++) {
            const y = baseY + t * layer.fontSize;
            if (y < 0 || y > canvas.height + layer.fontSize) continue;

            const char =
              charsRef.current && charsRef.current[li] && charsRef.current[li][i]
                ? charsRef.current[li][i][t]
                : '0';

            const alpha = 1 - t / trailLen;

            if (t === 0) {
              ctx.fillStyle = layer.headColor;
            } else {
              const gray =
                li === 2
                  ? Math.floor(180 * alpha)
                  : li === 1
                    ? Math.floor(140 * alpha)
                    : Math.floor(100 * alpha);
              ctx.fillStyle = `rgba(${gray}, ${gray}, ${gray}, ${alpha})`;
            }

            ctx.fillText(char, x, y);
          }

          // Move upward
          layer.drops[i] -= layer.speeds[i];

          // Reset when head is off the top
          const rows = Math.ceil(canvas.height / layer.fontSize);
          if (baseY < -layer.fontSize * trailLen && Math.random() > 0.98) {
            layer.drops[i] = rows + Math.random() * 10;
          }
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initLayers]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.matrixCanvas}
      aria-hidden="true"
    />
  );
}
