import { useEffect, useRef } from "react";

const QUICK_EMOJI = ["👍", "🎉", "❤️", "😂", "👀", "🚀", "✅", "🙏"];

export function EmojiPicker({
  onPick,
  onRequestClose,
}: {
  onPick: (emoji: string) => void;
  onRequestClose: () => void;
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onRequestClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onRequestClose]);

  return (
    <div
      className="border-border bg-card absolute top-8 right-0 z-10 flex gap-1 rounded-md border p-1.5 shadow-md"
      ref={ref}
    >
      {QUICK_EMOJI.map((emoji) => (
        <button
          aria-label={`React with ${emoji}`}
          className="hover:bg-accent flex h-7 w-7 items-center justify-center rounded text-base"
          key={emoji}
          onClick={() => onPick(emoji)}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
