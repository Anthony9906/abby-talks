import type { ButtonHTMLAttributes, ReactNode } from "react";

type BigButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  tone?: "sun" | "sky" | "mint" | "rose" | "white";
};

const tones = {
  sun: "bg-amber-400 text-amber-950 shadow-amber-200 active:bg-amber-500",
  sky: "bg-sky-400 text-sky-950 shadow-sky-200 active:bg-sky-500",
  mint: "bg-emerald-400 text-emerald-950 shadow-emerald-200 active:bg-emerald-500",
  rose: "bg-rose-400 text-rose-950 shadow-rose-200 active:bg-rose-500",
  white: "bg-white text-gray-800 shadow-gray-200 active:bg-gray-100",
};

export function BigButton({
  children,
  tone = "sun",
  className = "",
  ...props
}: BigButtonProps) {
  return (
    <button
      className={`min-h-16 rounded-3xl px-6 py-4 text-xl font-black shadow-soft transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${tones[tone]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
