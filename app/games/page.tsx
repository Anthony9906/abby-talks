"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { parseRole, roleLabels } from "@/lib/roles";

const adventures = [
  {
    eyebrow: "亲子数学",
    title: "Math Battle",
    subtitle: "爸爸 VS 女儿",
    description: "横屏双人抢答，也可以进入秘密训练营复习错题。",
    href: "/math",
    icon: "➕",
    action: "开始数学对战",
    card: "border-sky-200 bg-sky-50",
    iconTone: "bg-sky-200",
    actionTone: "bg-sky-500 text-white",
  },
  {
    eyebrow: "英语阅读",
    title: "Dragon Masters",
    subtitle: "Reading Quest",
    description: "沿着冒险地图读故事、写下发现并点亮盾牌。",
    href: "/dragon-masters",
    icon: "🐉",
    action: "继续阅读冒险",
    card: "border-emerald-200 bg-emerald-50",
    iconTone: "bg-emerald-200",
    actionTone: "bg-emerald-500 text-white",
  },
] as const;

export default function GameHub() {
  const searchParams = useSearchParams();
  const role = parseRole(searchParams.get("role"));

  if (!role) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-soft">
          <h1 className="text-3xl font-black text-slate-950">请先选择角色</h1>
          <Link className="mt-5 inline-block rounded-full bg-teal-500 px-6 py-3 text-xl font-black text-white" href="/">
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-5 md:px-8 md:py-8">
      <section className="mx-auto flex min-h-[calc(100dvh-2.5rem)] max-w-6xl flex-col gap-5 md:gap-6">
        <header className="relative overflow-hidden rounded-[2rem] bg-white/90 px-5 py-5 shadow-soft md:px-8 md:py-7">
          <div aria-hidden="true" className="absolute -right-8 -top-10 h-36 w-36 rounded-full bg-amber-200/70" />
          <div aria-hidden="true" className="absolute right-24 top-12 h-16 w-16 rounded-full bg-teal-200/70" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-lg font-black tracking-wide text-teal-600">ABBY TALKS</p>
              <h1 className="mt-1 text-4xl font-black leading-none text-gray-950 md:text-6xl">
                今天玩什么？
              </h1>
            </div>
            <p className="max-w-xl text-lg font-bold leading-snug text-gray-600 md:text-right md:text-xl">
              选一个任务开始。每一次阅读和练习，都是新的冒险。
            </p>
            <div className="flex items-center gap-3 md:absolute md:right-8 md:top-6">
              <span className="rounded-full bg-teal-100 px-4 py-2 text-base font-black text-teal-800">
                当前角色：{roleLabels[role]}
              </span>
              <Link className="font-black text-teal-700 underline" href="/">切换</Link>
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-5 md:grid-cols-2">
          {adventures.map((game) => (
            <Link
              aria-label={`${game.action}：${game.title}`}
              className={`group flex min-h-[21rem] flex-col justify-between rounded-[2rem] border-4 p-5 shadow-soft transition hover:-translate-y-1 active:scale-[0.99] md:p-7 ${game.card}`}
              href={`${game.href}?role=${role}`}
              key={game.title}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  aria-hidden="true"
                  className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.75rem] text-5xl shadow-soft md:h-24 md:w-24 md:text-6xl ${game.iconTone}`}
                >
                  {game.icon}
                </div>
                <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-black text-gray-600 shadow-soft">
                  {game.eyebrow}
                </span>
              </div>

              <div className="my-6">
                <h2 className="text-4xl font-black leading-none text-gray-950 md:text-5xl">{game.title}</h2>
                <p className="mt-2 text-2xl font-black text-gray-700">{game.subtitle}</p>
                <p className="mt-4 max-w-lg text-lg font-bold leading-snug text-gray-600">{game.description}</p>
              </div>

              <div className={`flex min-h-16 items-center justify-between rounded-3xl px-5 py-4 text-xl font-black shadow-soft ${game.actionTone}`}>
                <span>{game.action}</span>
                <span aria-hidden="true" className="text-3xl transition group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>

        <footer className="flex flex-wrap items-center justify-end gap-3 rounded-[1.5rem] bg-white/75 px-5 py-4 text-sm font-bold text-gray-600 shadow-soft">
          <span>建议横屏体验数学对战 · 阅读任务横竖屏都可以</span>
        </footer>
      </section>
    </main>
  );
}
