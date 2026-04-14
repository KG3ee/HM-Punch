const EXCLUDED_ROLES = new Set(["CHEF", "DRIVER", "MAID"]);

interface MoodBadgeProps {
  mood: string | null | undefined;
  role?: string | null;
  size?: "sm" | "md";
}

export function MoodBadge({ mood, role, size = "sm" }: MoodBadgeProps) {
  if (!mood) return null;
  if (role && EXCLUDED_ROLES.has(role)) return null;
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
