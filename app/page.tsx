"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Role } from "@/lib/roles";
import { roleLabels } from "@/lib/roles";

export default function CoverPage() {
  const [showRolePicker, setShowRolePicker] = useState(false);
  const router = useRouter();

  const chooseRole = (role: Role) => {
    router.push(`/games?role=${role}`);
  };

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
        <button
          aria-label="进入 Abby Talks 游戏选择页面"
          className="group flex min-h-20 w-full max-w-md items-center justify-center gap-4 rounded-full border-[6px] border-white/90 bg-[#082d63] px-8 py-4 text-center text-2xl font-black text-white shadow-[0_18px_40px_rgba(8,45,99,0.38)] transition hover:-translate-y-1 hover:bg-[#0b3b7d] active:scale-[0.98] md:min-h-24 md:max-w-lg md:text-3xl"
          onClick={() => setShowRolePicker(true)}
          type="button"
        >
          <span>进入 Game Hub</span>
          <span aria-hidden="true" className="text-4xl transition group-hover:translate-x-1">
            →
          </span>
        </button>
      </div>

      {showRolePicker && (
        <div
          aria-labelledby="role-picker-title"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-5 backdrop-blur-sm"
          role="dialog"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setShowRolePicker(false);
          }}
        >
          <div className="w-full max-w-xl rounded-[2rem] border-4 border-white bg-[#fffaf0] p-6 shadow-[0_24px_70px_rgba(8,45,99,0.35)] md:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-black tracking-wide text-teal-600">WHO IS PLAYING?</p>
                <h1 className="mt-1 text-3xl font-black text-slate-950 md:text-4xl" id="role-picker-title">
                  选择你的角色
                </h1>
                <p className="mt-2 font-bold text-slate-600">游戏会加载并保存到这个角色的云端记录。</p>
              </div>
              <button
                aria-label="关闭角色选择"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-2xl font-black text-slate-600 shadow-soft"
                onClick={() => setShowRolePicker(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              {(["dad", "abby"] as const).map((role) => (
                <button
                  className={`flex min-h-40 flex-col items-center justify-center rounded-[1.75rem] border-4 bg-white text-slate-950 shadow-soft transition hover:-translate-y-1 active:scale-[0.98] ${
                    role === "dad" ? "border-sky-300" : "border-rose-300"
                  }`}
                  key={role}
                  onClick={() => chooseRole(role)}
                  type="button"
                >
                  <span aria-hidden="true" className="text-6xl">{role === "dad" ? "👨" : "👧"}</span>
                  <span className="mt-3 text-3xl font-black">{roleLabels[role]}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
