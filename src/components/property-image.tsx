import { cn } from "@/lib/cn";

// Generated placeholder art standing in for real photos until S3 is wired up.
// Deterministic per seed so a given photo always looks the same.

function rand(seed: number) {
  let s = (seed * 9301 + 49297) % 233280;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const skies = [
  ["#9cc7e6", "#e8f1f6"], // clear day
  ["#f2b48a", "#f8e2c8"], // golden hour
  ["#3b4a7a", "#e59a6e"], // twilight
  ["#b7d3e3", "#f3f0e8"], // soft overcast
  ["#7fb2d8", "#d6ebf5"],
];
const walls = ["#efe9df", "#d9d2c5", "#c9b9a3", "#f4f1ea", "#b8b3a8", "#e3d6c2", "#9aa39b"];
const roofs = ["#4a4743", "#5f4b3e", "#3d4650", "#6b5d52", "#2f3335"];
const greens = ["#6f8f5a", "#58794a", "#7f9a63", "#4f6b44"];

export function PropertyImage({
  seed,
  className,
  label,
  variant = "exterior",
}: {
  seed: number;
  className?: string;
  label?: string;
  variant?: "exterior" | "interior" | "auto";
}) {
  const r = rand(seed + 1);
  const kind = variant === "auto" ? (seed % 3 === 1 ? "interior" : "exterior") : variant;
  const sky = skies[Math.floor(r() * skies.length)];
  const wall = walls[Math.floor(r() * walls.length)];
  const roof = roofs[Math.floor(r() * roofs.length)];
  const green = greens[Math.floor(r() * greens.length)];
  const twilight = sky[0] === "#3b4a7a";
  const id = `p${seed}`;

  if (kind === "interior") {
    const floor = ["#b8946a", "#c9ad88", "#8f7457", "#d8cfc2"][Math.floor(r() * 4)];
    const sofa = ["#5f6f73", "#a99a86", "#4e5b4f", "#8a6e5a"][Math.floor(r() * 4)];
    return (
      <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" className={cn("block h-full w-full", className)} role="img" aria-label={label ?? "Interior photo placeholder"}>
        <defs>
          <linearGradient id={`${id}w`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={wall} />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={`${id}win`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={sky[0]} />
            <stop offset="1" stopColor={sky[1]} />
          </linearGradient>
        </defs>
        <rect width="300" height="200" fill={`url(#${id}w)`} />
        <polygon points="0,150 300,150 300,200 0,200" fill={floor} />
        <polygon points="0,150 300,150 300,156 0,156" fill="#000" opacity="0.06" />
        <rect x="170" y="38" width="96" height="92" rx="2" fill={`url(#${id}win)`} stroke="#fff" strokeWidth="4" />
        <line x1="218" y1="38" x2="218" y2="130" stroke="#fff" strokeWidth="3" />
        <rect x="160" y="150" width="120" height="18" fill="#fff" opacity="0.18" />
        <rect x="28" y="112" width="112" height="34" rx="8" fill={sofa} />
        <rect x="22" y="104" width="16" height="44" rx="6" fill={sofa} />
        <rect x="130" y="104" width="16" height="44" rx="6" fill={sofa} />
        <rect x="40" y="98" width="88" height="22" rx="7" fill={sofa} opacity="0.85" />
        <rect x="60" y="160" width="60" height="6" rx="3" fill="#000" opacity="0.15" />
        <rect x="56" y="150" width="68" height="10" rx="3" fill="#3a3330" opacity="0.8" />
        <circle cx="70" cy="58" r="14" fill="#fff" opacity="0.5" />
        <line x1="70" y1="0" x2="70" y2="44" stroke="#3a3330" strokeWidth="1.5" opacity="0.5" />
        <rect x="280" y="0" width="20" height="200" fill="#000" opacity="0.04" />
      </svg>
    );
  }

  const roofType = Math.floor(r() * 3);
  const hx = 70 + r() * 40;
  const hw = 150 + r() * 30;
  const hy = 92 + r() * 12;
  const windowGlow = twilight ? "#ffd27a" : "#cfe2ee";
  const second = r() > 0.5;

  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" className={cn("block h-full w-full", className)} role="img" aria-label={label ?? "Property photo placeholder"}>
      <defs>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} />
          <stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width="300" height="200" fill={`url(#${id}s)`} />
      {twilight && <circle cx="250" cy="34" r="2" fill="#fff" opacity="0.8" />}
      <path d={`M0 ${130 + r() * 10} Q 80 ${110 + r() * 15} 160 ${125} T 300 ${118 + r() * 12} V200 H0Z`} fill={green} opacity="0.55" />
      <ellipse cx={hx - 30} cy={hy + 50} rx="26" ry="36" fill={green} />
      <ellipse cx={hx + hw + 26} cy={hy + 46} rx="22" ry="34" fill={green} opacity="0.9" />
      {/* house body */}
      <rect x={hx} y={hy} width={hw} height="70" fill={wall} />
      {second && <rect x={hx + hw * 0.55} y={hy - 30} width={hw * 0.45} height="32" fill={wall} />}
      {/* roof */}
      {roofType === 0 && <polygon points={`${hx - 10},${hy} ${hx + hw / 2},${hy - 38} ${hx + hw + 10},${hy}`} fill={roof} />}
      {roofType === 1 && <polygon points={`${hx - 12},${hy} ${hx + 20},${hy - 22} ${hx + hw - 20},${hy - 22} ${hx + hw + 12},${hy}`} fill={roof} />}
      {roofType === 2 && <rect x={hx - 8} y={hy - 8} width={hw + 16} height="10" fill={roof} />}
      {second && <rect x={hx + hw * 0.55 - 6} y={hy - 38} width={hw * 0.45 + 12} height="9" fill={roof} />}
      {/* windows + door */}
      {[0.12, 0.34, 0.7].map((f, i) => (
        <rect key={i} x={hx + hw * f} y={hy + 16} width="22" height="22" fill={windowGlow} stroke="#fff" strokeWidth="2" />
      ))}
      {second && <rect x={hx + hw * 0.68} y={hy - 22} width="30" height="16" fill={windowGlow} stroke="#fff" strokeWidth="2" />}
      <rect x={hx + hw * 0.52} y={hy + 28} width="18" height="42" fill={roof} opacity="0.85" />
      {/* drive + lawn */}
      <rect x="0" y={hy + 70} width="300" height={200 - hy - 70} fill={green} />
      <polygon points={`${hx + hw * 0.5},${hy + 70} ${hx + hw * 0.62},${hy + 70} ${hx + hw * 0.9},200 ${hx + hw * 0.3},200`} fill="#d6d1c7" opacity="0.9" />
      {twilight && <rect width="300" height="200" fill="#1b2050" opacity="0.18" />}
    </svg>
  );
}
