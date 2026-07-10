import Link from "next/link";

export default function CoverPage() {
  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#fbf2d8]">
      <img
        alt="Abby Talks 阅读与数学游戏世界：小龙、故事书、冒险道路和数字卡片"
        className="absolute inset-0 h-full w-full object-contain object-center"
        src="/game-hub-cover.png"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#fbf2d8]/95 via-[#fbf2d8]/50 to-transparent md:h-52"
      />

      <div className="absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-10 flex justify-center px-5 md:bottom-[max(2.5rem,env(safe-area-inset-bottom))]">
        <Link
          aria-label="进入 Abby Talks 游戏选择页面"
          className="group flex min-h-20 w-full max-w-md items-center justify-center gap-4 rounded-full border-[6px] border-white/90 bg-[#082d63] px-8 py-4 text-center text-2xl font-black text-white shadow-[0_18px_40px_rgba(8,45,99,0.38)] transition hover:-translate-y-1 hover:bg-[#0b3b7d] active:scale-[0.98] md:min-h-24 md:max-w-lg md:text-3xl"
          href="/games"
        >
          <span>进入 Game Hub</span>
          <span aria-hidden="true" className="text-4xl transition group-hover:translate-x-1">
            →
          </span>
        </Link>
      </div>
    </main>
  );
}
