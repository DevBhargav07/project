import { useEffect, useRef } from "react";

// A subtle, low-opacity Matrix "digital rain" animation.
// Renders behind the auth forms via <canvas>, purely decorative.
export default function MatrixRain() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let animationId;
    let columns;
    let drops;

    const chars =
      "アイウエオカキクケコサシスセソ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const fontSize = 16;

    const setup = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      columns = Math.floor(canvas.width / fontSize);
      drops = new Array(columns).fill(1);
    };

    const draw = () => {
      // translucent black over the whole canvas creates the fading trail
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(0, 255, 70, 0.35)"; // subtle, not neon-bright
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }

      animationId = requestAnimationFrame(draw);
    };

    setup();
    draw();
    window.addEventListener("resize", setup);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", setup);
    };
  }, []);

  return <canvas ref={canvasRef} className="matrix-canvas" />;
}
