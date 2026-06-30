import React, { useEffect, useRef, useCallback } from 'react';
import styles from './styles.module.css';

const BINARY = '01';

export default function MatrixRain() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const dataRef = useRef(null);

  const init = useCallback((canvas, logoImg) => {
    if (canvas.width === 0 || canvas.height === 0) return;
    const fontSize = 20;
    const spacing = fontSize * 0.7;
    const cols = Math.floor(canvas.width / spacing);
    const rows = Math.ceil(canvas.height / fontSize);

    // Persistent binary grid characters
    const chars = Array.from({ length: rows + 30 }, () =>
      Array.from({ length: cols }, () => BINARY[Math.floor(Math.random() * 2)])
    );

    // Column animation settings
    const columns = Array.from({ length: cols }, () => ({
      y: rows + Math.random() * rows,
      speed: 0.13 + Math.random() * 0.17,
    }));

    // Create high-resolution temporary canvas to draw the shield logo mask
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    // Render Logo Mask Only
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, canvas.width, canvas.height);
    if (logoImg && logoImg.complete) {
      const headH = canvas.height * 1.25;
      const headW = headH; // square aspect ratio
      const cx = (canvas.width - headW) / 2;
      const cy = (canvas.height - headH) / 2;
      tempCtx.drawImage(logoImg, cx, cy, headW, headH);
    }

    const logoImgData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
    const logoMask = new Float32Array(cols * rows);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const px = Math.floor(c * spacing + spacing / 2);
        const py = Math.floor(r * fontSize + fontSize / 2);

        if (px >= 0 && px < canvas.width && py >= 0 && py < canvas.height) {
          const idx = (py * canvas.width + px) * 4;
          const averageColor = (logoImgData.data[idx] + logoImgData.data[idx + 1] + logoImgData.data[idx + 2]) / 3;
          logoMask[r * cols + c] = averageColor < 120 ? 1.0 : 0.0;
        } else {
          logoMask[r * cols + c] = 0;
        }
      }
    }

    dataRef.current = { fontSize, spacing, cols, rows, chars, columns, logoMask };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let frameCount = 0;
    let resizeTimeout;
    let resizeHandler = null;

    const logoImg = new Image();
    logoImg.src = '/img/favicon.png';

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const width = parent.offsetWidth;
      const height = parent.offsetHeight;
      if (width === 0 || height === 0) {
        resizeTimeout = setTimeout(resize, 100);
        return;
      }
      canvas.width = width;
      canvas.height = height;
      init(canvas, logoImg);
    };

    const initAndStart = () => {
      resizeHandler = resize;
      resize();
      window.addEventListener('resize', resize);

      const draw = () => {
        frameCount++;
        const d = dataRef.current;
        if (!d) {
          animationRef.current = requestAnimationFrame(draw);
          return;
        }

        const { fontSize, spacing, cols, rows, chars, columns, logoMask } = d;

        // Draw pure black background
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.font = `${fontSize}px monospace`;
        ctx.textBaseline = 'top';
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';

        // Slowly swap characters in the main rain every 18 frames
        if (frameCount % 18 === 0) {
          for (let r = 0; r < chars.length; r++) {
            if (Math.random() < 0.15) {
              const c = Math.floor(Math.random() * cols);
              chars[r][c] = BINARY[Math.floor(Math.random() * 2)];
            }
          }
        }

        // Draw the digital rain matrix cells
        for (let col = 0; col < cols; col++) {
          const x = col * spacing;
          const colData = columns[col];
          const headRow = Math.floor(colData.y);

          for (let row = 0; row < rows; row++) {
            const y = row * fontSize;
            const maskVal = logoMask[row * cols + col];

            // Dist from rising head controls fading
            const distFromHead = row - headRow;
            const inTrail = distFromHead >= 0 && distFromHead < 25;
            const trailFade = inTrail ? (1 - distFromHead / 25) : 0;

            const charRow = (row + Math.floor(colData.y * 0.4)) % chars.length;
            const char = chars[Math.abs(charRow)][col];

            // If inside the Covertia shield mask lines, render with high-contrast transparent colors
            if (maskVal > 0.15) {
              const b = maskVal * (inTrail ? (1 + 0.4 * trailFade) : 0.8);
              
              if (b > 0.75) {
                // Glowing white-cyan head of column on mask (reduced opacity for transparency)
                ctx.shadowBlur = 3;
                ctx.shadowColor = `rgba(0, 210, 255, ${b * 0.4})`;
                const r = Math.floor(180 + 75 * (b - 0.75) * 4);
                const g = Math.min(255, Math.floor(230 + 25 * (b - 0.75) * 4));
                ctx.fillStyle = `rgba(${r}, ${g}, 255, 0.55)`;
              } else {
                // Vivid cyan body on mask (reduced opacity for transparency)
                ctx.shadowBlur = 0;
                ctx.fillStyle = `rgba(0, 180, 240, ${b * 0.4})`;
              }
            } else if (inTrail) {
              // Regular background columns rising (clearly visible gray digits)
              ctx.shadowBlur = 0;
              ctx.fillStyle = `rgba(130, 130, 130, ${trailFade * 0.45})`;
            } else {
              // Faint background binary static noise (faint gray digits)
              ctx.shadowBlur = 0;
              ctx.fillStyle = `rgba(80, 80, 80, 0.06)`;
            }

            ctx.fillText(char, x, y);
          }

          // Rise upward
          colData.y -= colData.speed;
          if (colData.y < -25) {
            colData.y = rows + Math.random() * 15;
          }
        }

        animationRef.current = requestAnimationFrame(draw);
      };

      draw();
    };

    if (logoImg.complete) {
      initAndStart();
    } else {
      logoImg.onload = initAndStart;
    }

    return () => {
      if (resizeHandler) {
        window.removeEventListener('resize', resizeHandler);
      }
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [init]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.matrixCanvas}
      aria-hidden="true"
    />
  );
}
