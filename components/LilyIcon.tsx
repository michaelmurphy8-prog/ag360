// components/LilyIcon.tsx
// Lily's brand mark — Soft Bloom (6 circular petals)

export default function LilyIcon({ size = 32, color = "var(--ag-green)" }: { size?: number; color?: string }) {
  const petals = 6;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: petals }).map((_, i) => {
        const angle = (i * 360 / petals) - 90;
        const rad = angle * (Math.PI / 180);
        const cx = 24 + Math.cos(rad) * 11;
        const cy = 24 + Math.sin(rad) * 11;
        return (
          <circle
            key={i}
            cx={cx} cy={cy} r="8"
            fill={`${color}10`}
            stroke={color}
            strokeWidth="1"
          />
        );
      })}
      <circle cx="24" cy="24" r="6" fill={`${color}20`} stroke={color} strokeWidth="1.2" />
      <circle cx="24" cy="24" r="3" fill={color} opacity="0.9" />
    </svg>
  );
}