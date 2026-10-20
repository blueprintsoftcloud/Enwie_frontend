import React, { useEffect, useRef, useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { AmbientEffectType, OccasionPreset } from "../utils/occasionPresets";
import DiwaliFirecrackerCelebration from "./festive/DiwaliFirecrackerCelebration";

// ─── Particle Definitions ───────────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  flip: number;
  flipSpeed: number;
  opacity: number;
  shapeType: "petal" | "star" | "snow" | "gulal" | "confetti";
}

const PETAL_COLORS_ONAM = ["#F59E0B", "#FBBF24", "#EA580C", "#FEF08A", "#84CC16", "#FFFBEB"];
const PETAL_COLORS_PASTEL = ["#FDA4AF", "#FB7185", "#F43F5E", "#FFF1F2", "#FECDD3"];
const SPARKLE_COLORS = ["#F59E0B", "#D97706", "#FDE047", "#FFFFFF", "#FEF08A", "#FBBF24"];
const SNOW_COLORS = ["#FFFFFF", "#F0F9FF", "#E0F2FE", "#CBD5E1"];
const GULAL_COLORS = ["#EC4899", "#F43F5E", "#FACC15", "#06B6D4", "#10B981", "#8B5CF6", "#FB923C"];
const CONFETTI_COLORS = ["#EF4444", "#3B82F6", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#FFFFFF"];

function getRandomColor(effect: AmbientEffectType, occasionId: string): string {
  if (effect === "petals") {
    return occasionId === "onam"
      ? PETAL_COLORS_ONAM[Math.floor(Math.random() * PETAL_COLORS_ONAM.length)]
      : PETAL_COLORS_PASTEL[Math.floor(Math.random() * PETAL_COLORS_PASTEL.length)];
  }
  if (effect === "sparkles") {
    return SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)];
  }
  if (effect === "snow") {
    return SNOW_COLORS[Math.floor(Math.random() * SNOW_COLORS.length)];
  }
  if (effect === "gulal") {
    return GULAL_COLORS[Math.floor(Math.random() * GULAL_COLORS.length)];
  }
  return CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
}

const StandardAmbientOverlay: React.FC<{ activeOccasion: OccasionPreset }> = ({
  activeOccasion,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);

  const ambientEffect = activeOccasion?.ambientEffect;

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      setIsPlaying(false);
    }
  }, []);

  // Timer: Start fadeout at 7.5s, complete and stop loop at 9s
  useEffect(() => {
    if (!isPlaying || !ambientEffect) return;

    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
    }, 7500);

    const stopTimer = setTimeout(() => {
      setIsPlaying(false);
      setIsFadingOut(false);
    }, 9000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(stopTimer);
    };
  }, [isPlaying, ambientEffect]);

  // Particle simulation loop on HTML5 canvas
  useEffect(() => {
    if (!isPlaying || !ambientEffect) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    // Generate 28-36 particles based on effect type
    const count = ambientEffect === "sparkles" ? 36 : 28;
    const particles: Particle[] = [];

    const shape =
      ambientEffect === "petals"
        ? "petal"
        : ambientEffect === "sparkles"
        ? "star"
        : ambientEffect === "snow"
        ? "snow"
        : ambientEffect === "gulal"
        ? "gulal"
        : "confetti";

    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height * 0.5,
        vx: (Math.random() - 0.5) * (ambientEffect === "petals" ? 1.2 : 0.8),
        vy:
          ambientEffect === "snow"
            ? 0.9 + Math.random() * 1.2
            : ambientEffect === "petals"
            ? 1.2 + Math.random() * 1.6
            : ambientEffect === "sparkles"
            ? 0.6 + Math.random() * 1.0
            : ambientEffect === "gulal"
            ? 0.4 + Math.random() * 0.8
            : 1.5 + Math.random() * 2.2,
        size:
          ambientEffect === "petals"
            ? 10 + Math.random() * 8
            : ambientEffect === "sparkles"
            ? 5 + Math.random() * 6
            : ambientEffect === "snow"
            ? 4 + Math.random() * 6
            : ambientEffect === "gulal"
            ? 12 + Math.random() * 18
            : 8 + Math.random() * 6,
        color: getRandomColor(ambientEffect, activeOccasion?.id || ""),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.04,
        flip: Math.random() * Math.PI,
        flipSpeed: 0.02 + Math.random() * 0.03,
        opacity: 0.65 + Math.random() * 0.35,
        shapeType: shape,
      });
    }

    let running = true;

    const render = () => {
      if (!running || !ctx) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx + Math.sin(p.flip) * 0.5;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;
        p.flip += p.flipSpeed;

        if (p.y > height + 20) {
          p.y = -20;
          p.x = Math.random() * width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        const scaleX = Math.cos(p.flip);
        ctx.scale(scaleX, 1);
        ctx.globalAlpha = p.opacity;

        if (p.shapeType === "petal") {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(0, -p.size);
          ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.5, p.size * 0.8, p.size * 0.5, 0, p.size);
          ctx.bezierCurveTo(-p.size * 0.8, p.size * 0.5, -p.size * 0.8, -p.size * 0.5, 0, -p.size);
          ctx.fill();

          ctx.strokeStyle = "rgba(255,255,255,0.4)";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, -p.size * 0.7);
          ctx.lineTo(0, p.size * 0.7);
          ctx.stroke();
        } else if (p.shapeType === "star") {
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 8;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          for (let s = 0; s < 4; s++) {
            ctx.rotate(Math.PI / 2);
            ctx.lineTo(0, -p.size);
            ctx.lineTo(p.size * 0.25, -p.size * 0.25);
          }
          ctx.fill();
        } else if (p.shapeType === "snow") {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shapeType === "gulal") {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
          grad.addColorStop(0, p.color);
          grad.addColorStop(0.7, p.color + "99");
          grad.addColorStop(1, p.color + "00");
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.5, -p.size * 0.3, p.size, p.size * 0.6);
        }

        ctx.restore();
      }

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    animFrameIdRef.current = requestAnimationFrame(render);

    return () => {
      running = false;
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPlaying, ambientEffect, activeOccasion]);

  if (!ambientEffect || !isPlaying) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none z-[38] transition-opacity duration-1000 ease-out ${
        isFadingOut ? "opacity-0" : "opacity-100"
      }`}
      style={{ willChange: "opacity" }}
    />
  );
};

export const FestiveAmbientOverlay: React.FC = () => {
  const { activeOccasion } = useTheme();

  if (!activeOccasion) return null;

  // 🪔 If Diwali is active, trigger celebratory Firecracker Rockets, Canvas Fireworks & "Happy Diwali" Typography
  if (activeOccasion.id === "diwali") {
    return <DiwaliFirecrackerCelebration key="diwali-celebration" />;
  }

  return <StandardAmbientOverlay activeOccasion={activeOccasion} />;
};

export default FestiveAmbientOverlay;
