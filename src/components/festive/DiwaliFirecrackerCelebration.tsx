import React, { useEffect, useRef, useState, useCallback } from "react";

// ─── Firecracker Vector Components ──────────────────────────────────────────────

/**
 * Traditional Indian festive Diwali skyrocket firecracker with
 * gold bands, nose cone, guide stick, and an animated sparking fuse.
 */
export const DiwaliFirecrackerRocket: React.FC<{
  className?: string;
  size?: number;
  mirrored?: boolean;
}> = ({ className = "", size = 64, mirrored = false }) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className} ${
        mirrored ? "diwali-cracker-float-right" : "diwali-cracker-float-left"
      }`}
    >
      <svg
        width={size}
        height={size * 1.3}
        viewBox="0 0 100 130"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_4px_16px_rgba(245,158,11,0.7)] overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`coneGrad-${mirrored ? "r" : "l"}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFBEB" />
            <stop offset="35%" stopColor="#FDE047" />
            <stop offset="70%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>
          <linearGradient id={`fuselageGrad-${mirrored ? "r" : "l"}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7F1D1D" />
            <stop offset="25%" stopColor="#DC2626" />
            <stop offset="60%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
          <linearGradient id={`goldBands-${mirrored ? "r" : "l"}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="50%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>

        {/* Guidance Stick */}
        <rect x="48" y="70" width="4" height="55" rx="1.5" fill="#78350F" opacity="0.95" />

        {/* Rocket Main Fuselage */}
        <rect
          x="36"
          y="32"
          width="28"
          height="42"
          rx="3"
          fill={`url(#fuselageGrad-${mirrored ? "r" : "l"})`}
          stroke="#FBBF24"
          strokeWidth="1.5"
        />

        {/* Golden Festive Foil Bands */}
        <rect x="36" y="40" width="28" height="6" fill={`url(#goldBands-${mirrored ? "r" : "l"})`} />
        <rect x="36" y="56" width="28" height="6" fill={`url(#goldBands-${mirrored ? "r" : "l"})`} />

        {/* Auspicious Star Emblem on Fuselage */}
        <polygon
          points="50,47 51.5,50 55,50 52,52 53.5,55.5 50,53.5 46.5,55.5 48,52 45,50 48.5,50"
          fill="#991B1B"
        />

        {/* Nose Cone */}
        <path
          d="M50 8 L65 32 L35 32 Z"
          fill={`url(#coneGrad-${mirrored ? "r" : "l"})`}
          stroke="#FDE047"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />

        {/* Base Nozzle */}
        <path d="M41 74 L59 74 L56 79 L44 79 Z" fill="#292524" stroke="#F59E0B" strokeWidth="1" />

        {/* Burning Fuse */}
        <path
          d="M50 79 Q 56 89 64 87 Q 70 85 72 81"
          stroke="#F59E0B"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Animated Sparkling Fuse Sparks Cluster */}
        <g className="diwali-fuse-spark" style={{ transformOrigin: "72px 81px" }}>
          {/* Core glow */}
          <circle cx="72" cy="81" r="3.5" fill="#FFFBEB" />
          <circle cx="72" cy="81" r="7" fill="#FBBF24" opacity="0.8" />
          {/* Spark rays */}
          <line x1="72" y1="73" x2="72" y2="69" stroke="#FFFBEB" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="72" y1="89" x2="72" y2="93" stroke="#FFFBEB" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="64" y1="81" x2="60" y2="81" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="80" y1="81" x2="84" y2="81" stroke="#FDE047" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="66" y1="75" x2="62" y2="71" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="78" y1="87" x2="82" y2="91" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="66" y1="87" x2="62" y2="91" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="78" y1="75" x2="82" y2="71" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
};

// ─── Canvas Particle Fireworks Engine ──────────────────────────────────────────

interface RocketParticle {
  type: "rocket";
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetY: number;
  color: string;
  trail: { x: number; y: number; alpha: number }[];
}

interface SparkParticle {
  type: "spark";
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  gravity: number;
  flickerSpeed: number;
  tick: number;
}

type CrackerParticle = RocketParticle | SparkParticle;

const FIREWORK_COLORS = [
  "#FBBF24", // Golden Yellow
  "#F59E0B", // Warm Amber
  "#EF4444", // Ruby Red
  "#10B981", // Emerald Green
  "#EC4899", // Festive Magenta
  "#06B6D4", // Electric Cyan
  "#FFFFFF", // Diamond White
  "#FEF08A", // Bright Gold
];

export const DiwaliFirecrackerCelebration: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const [celebrationActive, setCelebrationActive] = useState<boolean>(true);
  const [fadingOut, setFadingOut] = useState<boolean>(false);

  // Check prefers-reduced-motion
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
  }, []);

  // Main celebration timer: 7.5s display, then 1.5s graceful fade-out
  const startCelebration = useCallback(() => {
    setCelebrationActive(true);
    setFadingOut(false);

    const fadeTimer = setTimeout(() => {
      setFadingOut(true);
    }, 7500);

    const endTimer = setTimeout(() => {
      setCelebrationActive(false);
      setFadingOut(false);
    }, 9000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(endTimer);
    };
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const cleanup = startCelebration();
    return cleanup;
  }, [reducedMotion, startCelebration]);

  // ─── Canvas Particle Fireworks Engine ─────────────────────────────────────────
  useEffect(() => {
    if (reducedMotion || !celebrationActive) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
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

    const particles: CrackerParticle[] = [];

    // Helper: spawn an ascending rocket
    const launchRocket = () => {
      const x = Math.random() * (width * 0.8) + width * 0.1;
      const targetY = Math.random() * (height * 0.45) + height * 0.12;
      const vy = -12 - Math.random() * 5;
      const vx = (Math.random() - 0.5) * 2.5;
      const color = FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

      particles.push({
        type: "rocket",
        x,
        y: height + 10,
        vx,
        vy,
        targetY,
        color,
        trail: [],
      });
    };

    // Helper: explode rocket into blooming chrysanthemum burst
    const explodeRocket = (x: number, y: number, baseColor: string) => {
      const sparkCount = 45 + Math.floor(Math.random() * 25);
      const ringColor =
        Math.random() > 0.4
          ? baseColor
          : FIREWORK_COLORS[Math.floor(Math.random() * FIREWORK_COLORS.length)];

      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5.5 + 1.5;
        const color = Math.random() > 0.25 ? ringColor : "#FFFBEB";

        particles.push({
          type: "spark",
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color,
          size: 2.2 + Math.random() * 2.2,
          alpha: 1,
          decay: 0.012 + Math.random() * 0.016,
          gravity: 0.075 + Math.random() * 0.035,
          flickerSpeed: 0.15 + Math.random() * 0.2,
          tick: Math.random() * 10,
        });
      }
    };

    // Pre-launch 2 initial fireworks rockets immediately
    launchRocket();
    setTimeout(launchRocket, 350);
    setTimeout(launchRocket, 800);

    let lastRocketTime = Date.now();
    let isRunning = true;

    const render = () => {
      if (!isRunning || !ctx) return;
      ctx.clearRect(0, 0, width, height);

      const now = Date.now();
      // Launch new rocket every 650ms to 950ms
      if (now - lastRocketTime > 750 + Math.random() * 300) {
        launchRocket();
        lastRocketTime = now;
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        if (p.type === "rocket") {
          // Record trail point
          p.trail.push({ x: p.x, y: p.y, alpha: 1 });
          if (p.trail.length > 8) p.trail.shift();

          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.05; // slight drag

          // Draw trail
          ctx.lineWidth = 2.5;
          for (let t = 0; t < p.trail.length; t++) {
            const tr = p.trail[t];
            const trAlpha = (t / p.trail.length) * 0.85;
            ctx.strokeStyle = `rgba(251, 191, 36, ${trAlpha})`;
            ctx.beginPath();
            ctx.arc(tr.x, tr.y, 1.8, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Draw rocket tip head
          ctx.fillStyle = "#FFFBEB";
          ctx.shadowBlur = 10;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;

          // Detonation check: reached target altitude or velocity inverted
          if (p.y <= p.targetY || p.vy >= -1) {
            explodeRocket(p.x, p.y, p.color);
            particles.splice(i, 1);
          }
        } else if (p.type === "spark") {
          p.tick += p.flickerSpeed;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.vx *= 0.97;
          p.vy *= 0.97;
          p.alpha -= p.decay;

          if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }

          // Shimmer flicker
          const flickerAlpha = Math.max(0, p.alpha + Math.sin(p.tick) * 0.25);
          ctx.save();
          ctx.globalAlpha = Math.min(1, flickerAlpha);
          ctx.fillStyle = p.color;
          ctx.shadowBlur = 6;
          ctx.shadowColor = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      isRunning = false;
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [reducedMotion, celebrationActive]);

  if (reducedMotion) return null;

  return (
    <>
      {/* 🎆 Ambient Canvas Fireworks Rockets */}
      {celebrationActive && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={`fixed inset-0 pointer-events-none z-[38] transition-opacity duration-1000 ease-out ${
            fadingOut ? "opacity-0" : "opacity-100"
          }`}
        />
      )}
    </>
  );
};

export default DiwaliFirecrackerCelebration;
