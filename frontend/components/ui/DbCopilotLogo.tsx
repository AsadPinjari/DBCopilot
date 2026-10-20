import React from "react";

interface DbCopilotLogoProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  withText?: boolean;
  withGlow?: boolean;
}

export function DbCopilotMark({
  size = 36,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 ${className}`}
      aria-label="DB Copilot Logo"
    >
      <defs>
        {/* Ambient Glow Gradient */}
        <radialGradient
          id="dbLogoGlow"
          cx="50%"
          cy="40%"
          r="60%"
          fx="50%"
          fy="30%"
        >
          <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
        </radialGradient>

        {/* Top Cylinder Gradient */}
        <linearGradient id="cylinderTopGrad" x1="8" y1="8" x2="40" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>

        {/* Cylinder Body Gradient (Left to Right light reflection) */}
        <linearGradient id="cylinderBodyGrad" x1="8" y1="14" x2="40" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e1b4b" />
          <stop offset="25%" stopColor="#312e81" />
          <stop offset="70%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>

        {/* Middle Tier Gradient */}
        <linearGradient id="tierGrad" x1="8" y1="20" x2="40" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0284c7" />
          <stop offset="50%" stopColor="#4f46e5" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>

        {/* AI Sparkle Star Gradient */}
        <linearGradient id="aiSparkGrad" x1="28" y1="4" x2="44" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="50%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#ec4899" />
        </linearGradient>

        {/* Rim Stroke Gradient */}
        <linearGradient id="rimStroke" x1="8" y1="8" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#818cf8" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4338ca" stopOpacity="0.4" />
        </linearGradient>

        <filter id="aiGlow" x="22" y="2" width="26" height="26" filterUnits="userSpaceOnUse">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* Background Soft Glow */}
      <circle cx="24" cy="24" r="22" fill="url(#dbLogoGlow)" />

      {/* --- DATABASE STACK (Tier 3 - Base) --- */}
      <path
        d="M8 30C8 27.24 15.16 25 24 25C32.84 25 40 27.24 40 30V35C40 37.76 32.84 40 24 40C15.16 40 8 37.76 8 35V30Z"
        fill="url(#cylinderBodyGrad)"
        stroke="url(#rimStroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Base accent highlight ring */}
      <path
        d="M8 35C8 37.76 15.16 40 24 40C32.84 40 40 37.76 40 35"
        stroke="#38bdf8"
        strokeWidth="1.2"
        strokeOpacity="0.6"
        strokeLinecap="round"
      />

      {/* --- DATABASE STACK (Tier 2 - Middle) --- */}
      <path
        d="M8 21C8 18.24 15.16 16 24 16C32.84 16 40 18.24 40 21V26C40 28.76 32.84 31 24 31C15.16 31 8 28.76 8 26V21Z"
        fill="url(#cylinderBodyGrad)"
        stroke="url(#rimStroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      {/* Middle accent highlight ring */}
      <path
        d="M8 26C8 28.76 15.16 31 24 31C32.84 31 40 28.76 40 26"
        stroke="#818cf8"
        strokeWidth="1.2"
        strokeOpacity="0.7"
        strokeLinecap="round"
      />

      {/* --- DATABASE STACK (Tier 1 - Top Body) --- */}
      <path
        d="M8 12C8 9.24 15.16 7 24 7C32.84 7 40 9.24 40 12V17C40 19.76 32.84 22 24 22C15.16 22 8 19.76 8 17V12Z"
        fill="url(#cylinderBodyGrad)"
        stroke="url(#rimStroke)"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Top Cap Ellipse */}
      <ellipse
        cx="24"
        cy="12"
        rx="16"
        ry="5"
        fill="url(#cylinderTopGrad)"
        stroke="#67e8f9"
        strokeWidth="1"
      />

      {/* Inner Cylinder Core Ring */}
      <ellipse
        cx="24"
        cy="12"
        rx="11"
        ry="3.2"
        fill="#0f172a"
        fillOpacity="0.6"
        stroke="#38bdf8"
        strokeWidth="0.8"
        strokeDasharray="2 2"
      />

      {/* Relational Data Nodes / Query Links */}
      <circle cx="16" cy="21" r="1.5" fill="#38bdf8" />
      <circle cx="24" cy="23" r="1.5" fill="#818cf8" />
      <circle cx="32" cy="21" r="1.5" fill="#38bdf8" />
      <path
        d="M16 21L24 23L32 21"
        stroke="#38bdf8"
        strokeWidth="0.8"
        strokeOpacity="0.5"
      />

      <circle cx="16" cy="30" r="1.5" fill="#818cf8" />
      <circle cx="24" cy="32" r="1.5" fill="#38bdf8" />
      <circle cx="32" cy="30" r="1.5" fill="#818cf8" />
      <path
        d="M16 30L24 32L32 30"
        stroke="#818cf8"
        strokeWidth="0.8"
        strokeOpacity="0.5"
      />

      {/* --- AI COPILOT SPARKLE / INTELLIGENCE BEACON --- */}
      <g filter="url(#aiGlow)">
        {/* Main 4-pointed sparkle */}
        <path
          d="M36 6C36 10 39.5 12 43 12C39.5 12 36 14 36 18C36 14 32.5 12 29 12C32.5 12 36 10 36 6Z"
          fill="url(#aiSparkGrad)"
        />
        {/* Core hot spark */}
        <circle cx="36" cy="12" r="1.2" fill="#ffffff" />
      </g>

      {/* Secondary micro-sparkle */}
      <path
        d="M12 4C12 6 13.5 7 15 7C13.5 7 12 8 12 10C12 8 10.5 7 9 7C10.5 7 12 6 12 4Z"
        fill="#38bdf8"
        fillOpacity="0.9"
      />
    </svg>
  );
}

export default function DbCopilotLogo({
  size = "md",
  className = "",
  withText = true,
  withGlow = true,
}: DbCopilotLogoProps) {
  const pixelSizes = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 60,
  };

  const currentSize = pixelSizes[size];

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="relative flex items-center justify-center">
        {withGlow && (
          <div
            className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500/20 via-indigo-500/30 to-purple-500/20 blur-md transition duration-500 group-hover:scale-110 group-hover:opacity-100"
            aria-hidden="true"
          />
        )}
        <div className="relative flex items-center justify-center rounded-xl border border-white/10 bg-slate-900/90 p-1.5 shadow-xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-md">
          <DbCopilotMark size={currentSize} />
        </div>
      </div>

      {withText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-extrabold tracking-tight text-white md:text-lg">
              DB
            </span>
            <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-base font-extrabold tracking-tight text-transparent md:text-lg">
              Copilot
            </span>
            <span className="ml-1 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-1.5 py-0.2 text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
              v1.0
            </span>
          </div>
          <span className="text-[11px] font-medium tracking-wide text-slate-400">
            Intelligent Database Assistant
          </span>
        </div>
      )}
    </div>
  );
}
