"use client";

interface ReactionPaletteProps {
  palette: string[];
  onReact: (emoji: string) => void | Promise<void>;
}

export function ReactionPalette({ palette, onReact }: ReactionPaletteProps) {
  if (palette.length === 0) return null;

  return (
    <div className="flex gap-1 bg-base-200 rounded-full px-2 py-1 shadow-md">
      {palette.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="text-xl hover:scale-125 transition-transform active:scale-95"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
