interface MoodBadgeProps {
  mood: string | null | undefined;
  size?: "sm" | "md";
}

export function MoodBadge({ mood, size = "sm" }: MoodBadgeProps) {
  if (!mood) return null;
  const sizeClass = size === "sm" ? "text-xs" : "text-base";
  return (
    <span
      className={`absolute -bottom-1 -right-1 ${sizeClass} leading-none select-none`}
      aria-label={`Mood: ${mood}`}
    >
      {mood}
    </span>
  );
}
