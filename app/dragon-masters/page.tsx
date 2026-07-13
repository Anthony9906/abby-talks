"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearLegacyReadingProgress,
  loadLegacyReadingProgress,
  loadReadingProgress,
  saveReadingProgress,
} from "@/lib/reading-storage";
import { parseRole, roleLabels } from "@/lib/roles";

type Stop = {
  id: number;
  title: string;
  pdfUrl: string;
  x: number;
  y: number;
  rewardX: number;
  rewardY: number;
  milestone?: string;
};

type StopAnswer = {
  notes: string[];
  shields: boolean[];
};

type QuestProgress = Record<number, StopAnswer>;
type LegacyStopAnswer = Partial<StopAnswer> & {
  characters?: string;
  completed?: boolean;
  scene?: string;
  magic?: string;
};

const SHIELDS_PER_STOP = 25;

const createEmptyAnswer = (): StopAnswer => ({
  notes: [],
  shields: Array.from({ length: SHIELDS_PER_STOP }, () => false),
});

const stops: Stop[] = [
  {
    id: 1,
    title: "Rise of the Earth Dragon",
    pdfUrl: "/books/dragon-masters/book-01.pdf",
    x: 19.1,
    y: 33.5,
    rewardX: 25.2,
    rewardY: 36.2,
  },
  {
    id: 2,
    title: "Saving the Sun Dragon",
    pdfUrl: "/books/dragon-masters/book-02.pdf",
    x: 18,
    y: 53.6,
    rewardX: 24.2,
    rewardY: 56.3,
  },
  {
    id: 3,
    title: "Secret of the Water Dragon",
    pdfUrl: "/books/dragon-masters/book-03.pdf",
    x: 40.5,
    y: 52,
    rewardX: 46.8,
    rewardY: 55,
    milestone: "龙石挂坠",
  },
  {
    id: 4,
    title: "Power of the Fire Dragon",
    pdfUrl: "/books/dragon-masters/book-04.pdf",
    x: 36.7,
    y: 69.3,
    rewardX: 43.2,
    rewardY: 72.5,
  },
  {
    id: 5,
    title: "Song of the Poison Dragon",
    pdfUrl: "/books/dragon-masters/book-05.pdf",
    x: 75.3,
    y: 76.8,
    rewardX: 81.6,
    rewardY: 79.6,
  },
  {
    id: 6,
    title: "Flight of the Moon Dragon",
    pdfUrl: "/books/dragon-masters/book-06.pdf",
    x: 76,
    y: 63.4,
    rewardX: 82.1,
    rewardY: 66.3,
    milestone: "龙宝宝手办",
  },
  {
    id: 7,
    title: "Search for the Lightning Dragon",
    pdfUrl: "/books/dragon-masters/book-07.pdf",
    x: 56.7,
    y: 54.5,
    rewardX: 61.8,
    rewardY: 58.1,
  },
  {
    id: 8,
    title: "Roar of the Thunder Dragon",
    pdfUrl: "/books/dragon-masters/book-08.pdf",
    x: 78.3,
    y: 45.5,
    rewardX: 84.5,
    rewardY: 48.4,
  },
  {
    id: 9,
    title: "Chill of the Ice Dragon",
    pdfUrl: "/books/dragon-masters/book-09.pdf",
    x: 68,
    y: 32.7,
    rewardX: 73.8,
    rewardY: 36.1,
    milestone: "龙翼徽章",
  },
  {
    id: 10,
    title: "Waking the Rainbow Dragon",
    pdfUrl: "/books/dragon-masters/book-10.pdf",
    x: 83.8,
    y: 29,
    rewardX: 89.2,
    rewardY: 32.4,
  },
];

const getPassReward = (bookNumber: number) => 50 + (bookNumber - 1) * 5;

const getQualityBonus = (bookNumber: number) => 10 + (bookNumber - 1) * 5;

const getAudioUrl = (bookNumber: number) =>
  `/books/dragon-masters/book-${String(bookNumber).padStart(2, "0")}.mp3`;

const formatAudioTime = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const wholeSeconds = Math.floor(seconds);
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = wholeSeconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

const noteToneClasses = [
  "border-amber-200 bg-amber-100 text-amber-950",
  "border-emerald-200 bg-emerald-100 text-emerald-950",
  "border-sky-200 bg-sky-100 text-sky-950",
  "border-rose-200 bg-rose-100 text-rose-950",
  "border-violet-200 bg-violet-100 text-violet-950",
  "border-lime-200 bg-lime-100 text-lime-950",
];

const shieldSlots = Array.from({ length: SHIELDS_PER_STOP }, (_, index) => ({
  id: index,
  x: 4.2 + index * 3.82,
  y: 93.3,
}));

const guideItems = [
  {
    tone: "required",
    zh: "能讲出故事主线：开头、麻烦、出现了什么龙、结局是什么",
    en: "Tell the main story: beginning, problem, dragon, and ending.",
  },
  {
    tone: "required",
    zh: "能说出最喜欢的一幕，并讲清楚为什么",
    en: "Share a favorite scene and explain why it stands out.",
  },
  {
    tone: "bonus",
    zh: "能从书里找到 3 个关键词或证据",
    en: "Find three keywords or pieces of evidence in the book.",
  },
  {
    tone: "bonus",
    zh: "能分析角色的想法和行动，细节更具体",
    en: "Explain what a character thinks or does with specific details.",
  },
] satisfies Array<{
  tone: "required" | "bonus";
  zh: string;
  en: string;
}>;

const createInitialProgress = () =>
  stops.reduce<QuestProgress>((progress, stop) => {
    progress[stop.id] = createEmptyAnswer();
    return progress;
  }, {});

const normalizeShields = (saved: LegacyStopAnswer) => {
  if (Array.isArray(saved.shields)) {
    return Array.from({ length: SHIELDS_PER_STOP }, (_, index) => Boolean(saved.shields?.[index]));
  }

  return Array.from({ length: SHIELDS_PER_STOP }, (_, index) => Boolean(saved.completed && index === 0));
};

const normalizeProgress = (value: unknown) => {
  const parsed = value && typeof value === "object"
    ? (value as Record<number, LegacyStopAnswer | undefined>)
    : {};

  return stops.reduce<QuestProgress>((progress, stop) => {
    const saved = parsed[stop.id] ?? {};
    const legacyNotes = [saved.characters, saved.scene, saved.magic].filter(
      (item): item is string => Boolean(item?.trim()),
    );

    progress[stop.id] = {
      notes: Array.isArray(saved.notes) ? saved.notes : legacyNotes,
      shields: normalizeShields(saved),
    };
    return progress;
  }, {});
};

export default function DragonMastersPage() {
  const searchParams = useSearchParams();
  const role = parseRole(searchParams.get("role"));
  const [progress, setProgress] = useState<QuestProgress>(() => createInitialProgress());
  const [hydrated, setHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"loading" | "saved" | "saving" | "error">("loading");
  const [selectedStopId, setSelectedStopId] = useState<number>(1);
  const [noteDraft, setNoteDraft] = useState("");
  const [audioStopId, setAudioStopId] = useState<number | null>(null);
  const [audioPlayRequest, setAudioPlayRequest] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioIsPlaying, setAudioIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastSyncedProgressRef = useRef("");

  useEffect(() => {
    if (!role) return;
    let cancelled = false;

    const load = async () => {
      setSyncStatus("loading");
      try {
        let remoteProgress = normalizeProgress(await loadReadingProgress(role));
        const legacy = loadLegacyReadingProgress();
        const remoteIsEmpty = Object.values(remoteProgress).every(
          (stop) => stop.notes.length === 0 && !stop.shields.some(Boolean),
        );
        if (
          legacy &&
          remoteIsEmpty &&
          window.confirm(`检测到这台设备上的旧阅读记录，是否导入到 ${roleLabels[role]}？`)
        ) {
          remoteProgress = normalizeProgress(
            await saveReadingProgress(role, normalizeProgress(legacy)),
          );
          clearLegacyReadingProgress();
        }
        if (!cancelled) {
          lastSyncedProgressRef.current = JSON.stringify(remoteProgress);
          setProgress(remoteProgress);
          setSyncStatus("saved");
          setHydrated(true);
        }
      } catch {
        if (!cancelled) setSyncStatus("error");
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [role]);

  useEffect(() => {
    if (!hydrated || !role) return;
    const serialized = JSON.stringify(progress);
    if (serialized === lastSyncedProgressRef.current) return;

    setSyncStatus("saving");
    const timer = window.setTimeout(() => {
      void saveReadingProgress(role, progress)
        .then((saved) => {
          const normalized = normalizeProgress(saved);
          lastSyncedProgressRef.current = JSON.stringify(normalized);
          setSyncStatus("saved");
        })
        .catch(() => setSyncStatus("error"));
    }, 300);

    return () => window.clearTimeout(timer);
  }, [hydrated, progress, role]);

  const selectStop = (stopId: number) => {
    setSelectedStopId(stopId);
    setNoteDraft("");
    setAudioStopId(null);
    setAudioCurrentTime(0);
    setAudioDuration(0);
    setAudioIsPlaying(false);
  };

  useEffect(() => {
    if (audioStopId !== selectedStopId) return;

    audioRef.current
      ?.play()
      .then(() => setAudioIsPlaying(true))
      .catch(() => {
        // Some browsers block autoplay; controls remain visible for manual playback.
        setAudioIsPlaying(false);
      });
  }, [audioPlayRequest, audioStopId, selectedStopId]);

  const selectedStop = stops.find((stop) => stop.id === selectedStopId) ?? stops[0];
  const selectedAnswer = progress[selectedStop.id] ?? createEmptyAnswer();
  const selectedNotes = selectedAnswer.notes ?? [];
  const selectedShields = selectedAnswer.shields ?? createEmptyAnswer().shields;
  const selectedShieldCount = selectedShields.filter(Boolean).length;
  const selectedPassReward = getPassReward(selectedStop.id);
  const selectedQualityBonus = getQualityBonus(selectedStop.id);
  const selectedAudioUrl = getAudioUrl(selectedStop.id);
  const selectedMediaAvailable = false;
  const showAudioPlayer = audioStopId === selectedStop.id;
  const completedCount = useMemo(
    () => stops.filter((stop) => progress[stop.id]?.shields?.some(Boolean)).length,
    [progress],
  );
  const allComplete = completedCount === stops.length;

  const addNote = () => {
    const note = noteDraft.trim();
    if (!note) return;

    setProgress((current) => ({
      ...current,
      [selectedStop.id]: {
        ...(current[selectedStop.id] ?? createEmptyAnswer()),
        notes: [...(current[selectedStop.id]?.notes ?? []), note],
      },
    }));
    setNoteDraft("");
  };

  const lightShield = (shieldIndex: number) => {
    if (selectedShields[shieldIndex]) return;

    const password = window.prompt("请输入爸爸密码点亮盾牌");
    if (password?.trim() !== "975") return;

    setProgress((current) => ({
      ...current,
      [selectedStop.id]: {
        ...(current[selectedStop.id] ?? createEmptyAnswer()),
        shields: Array.from({ length: SHIELDS_PER_STOP }, (_, index) =>
          index === shieldIndex ? true : Boolean(current[selectedStop.id]?.shields?.[index]),
        ),
      },
    }));
  };

  const playSelectedAudio = () => {
    setAudioStopId(selectedStop.id);
    setAudioPlayRequest((request) => request + 1);
  };

  const toggleAudioPlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio
        .play()
        .then(() => setAudioIsPlaying(true))
        .catch(() => setAudioIsPlaying(false));
      return;
    }

    audio.pause();
    setAudioIsPlaying(false);
  };

  const seekAudio = (time: number) => {
    if (!audioRef.current) return;

    audioRef.current.currentTime = time;
    setAudioCurrentTime(time);
  };

  const skipAudio = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;

    const duration = Number.isFinite(audio.duration) ? audio.duration : audioCurrentTime;
    const nextTime = Math.min(Math.max(audio.currentTime + seconds, 0), duration);

    seekAudio(nextTime);
  };

  const retrySave = () => {
    if (!role) return;
    setSyncStatus("saving");
    void saveReadingProgress(role, progress)
      .then((saved) => {
        const normalized = normalizeProgress(saved);
        lastSyncedProgressRef.current = JSON.stringify(normalized);
        setSyncStatus("saved");
      })
      .catch(() => setSyncStatus("error"));
  };

  if (!role) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-soft">
          <h1 className="text-3xl font-black text-slate-950">请先选择角色</h1>
          <Link className="mt-5 inline-block rounded-full bg-emerald-500 px-6 py-3 text-xl font-black text-white" href="/">
            返回首页
          </Link>
        </div>
      </main>
    );
  }

  if (!hydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-soft">
          <h1 className="text-3xl font-black text-slate-950">
            {syncStatus === "error" ? "无法连接云端记录" : `正在加载 ${roleLabels[role]} 的记录…`}
          </h1>
          {syncStatus === "error" && (
            <button className="mt-5 rounded-full bg-emerald-500 px-6 py-3 text-xl font-black text-white" onClick={() => window.location.reload()} type="button">
              重新连接
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-3 py-4 md:px-6 md:py-6">
      <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl gap-4 xl:grid-cols-[1.45fr_0.75fr]">
        <div className="flex flex-col overflow-hidden rounded-[2rem] bg-white/90 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
            <div>
              <p className="text-base font-black text-emerald-600">Dragon Masters</p>
              <h1 className="text-3xl font-black leading-none text-gray-950 md:text-5xl">
                Reading Quest
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-3xl bg-emerald-100 px-4 py-2 text-lg font-black text-emerald-900">
                {completedCount}/10
              </div>
              <Link
                className="rounded-3xl bg-white px-5 py-3 text-lg font-black text-gray-800 shadow-soft transition active:scale-[0.98]"
                href={`/games?role=${role}`}
              >
                Game Hub
              </Link>
              <button
                className={`rounded-3xl px-4 py-2 text-sm font-black ${
                  syncStatus === "error" ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-800"
                }`}
                onClick={syncStatus === "error" ? retrySave : undefined}
                type="button"
              >
                {roleLabels[role]} · {syncStatus === "saving" ? "保存中…" : syncStatus === "error" ? "保存失败，重试" : "云端已保存"}
              </button>
            </div>
          </div>

          <div className="p-2 md:p-3">
            <div className="relative overflow-hidden rounded-[1.5rem] bg-emerald-50">
              <img
                alt="Color Dragon Masters Reading Quest adventure map"
                className="block w-full"
                src="/dragon-masters-reading-quest-boy.png"
              />
              <div className="absolute inset-0">
                {stops.map((stop) => {
                  const active = stop.id === selectedStop.id;
                  const completed = progress[stop.id]?.shields?.some(Boolean);
                  const shieldCount = progress[stop.id]?.shields?.filter(Boolean).length ?? 0;
                  const passReward = getPassReward(stop.id);

                  return (
                    <div key={stop.id}>
                      <button
                        aria-label={`Open stop ${stop.id}`}
                        className={`absolute flex h-[5.8%] min-h-8 w-[4.4%] min-w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] text-[clamp(0.72rem,1.35vw,1.05rem)] font-black shadow-soft transition active:scale-95 ${
                          completed
                            ? "border-slate-300 bg-slate-900 text-white"
                            : active
                              ? "border-white bg-emerald-500 text-white"
                              : "border-white bg-white/85 text-gray-900"
                        }`}
                        onClick={() => selectStop(stop.id)}
                        style={{ left: `${stop.x}%`, top: `${stop.y}%` }}
                        type="button"
                      >
                        {completed ? "✓" : stop.id}
                      </button>
                      <button
                        aria-label={`Open stop ${stop.id} shields`}
                        className={`absolute min-w-[2.6rem] -translate-x-1/2 -translate-y-1/2 rounded-full border px-1.5 py-0.5 text-center text-[clamp(0.52rem,0.72vw,0.66rem)] font-black shadow-sm transition active:scale-95 ${
                          active
                            ? "border-emerald-500/70 bg-white/70 text-emerald-950"
                            : "border-amber-200/60 bg-amber-50/70 text-amber-950"
                        }`}
                        onClick={() => selectStop(stop.id)}
                        style={{ left: `${stop.x + 3.7}%`, top: `${stop.y - 2.9}%` }}
                        type="button"
                      >
                        <span className="inline-flex items-center justify-center gap-1">
                          <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 rotate-45 rounded-[1px] border border-white/80 bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.8)]"
                          />
                          {shieldCount}
                        </span>
                      </button>
                      <button
                        aria-label={`Open reward for book ${stop.id}`}
                        className={`absolute min-w-[4.6rem] -translate-x-1/2 -translate-y-1/2 rounded-xl border px-1.5 py-1 text-left shadow-sm transition active:scale-95 ${
                          active
                            ? "border-emerald-500/60 bg-white/50 text-emerald-950"
                            : "border-amber-200/50 bg-amber-50/50 text-amber-950"
                        }`}
                        onClick={() => selectStop(stop.id)}
                        style={{ left: `${stop.rewardX}%`, top: `${stop.rewardY}%` }}
                        type="button"
                      >
                        <span className="block text-[clamp(0.58rem,0.85vw,0.78rem)] font-black leading-none">
                          Pass ¥{passReward}
                        </span>
                        {stop.milestone && (
                          <span className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-rose-100/50 px-1 py-0.5 text-[clamp(0.5rem,0.72vw,0.62rem)] font-black leading-none text-rose-700">
                            <span
                              aria-hidden="true"
                              className="h-1.5 w-1.5 rotate-45 rounded-[1px] bg-rose-600 shadow-[0_0_0_1px_rgba(255,255,255,0.7)]"
                            />
                            Gift
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
                {shieldSlots.map((slot) => {
                  const lit = Boolean(selectedShields[slot.id]);

                  return (
                    <button
                      aria-label={`点亮第 ${slot.id + 1} 个盾牌`}
                      className="absolute flex h-[5.8%] w-[3.4%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition active:scale-95"
                      key={slot.id}
                      onClick={() => lightShield(slot.id)}
                      style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                      type="button"
                    >
                      {lit && (
                        <>
                          <span className="absolute inset-0 rounded-full bg-emerald-300/25 blur-[1px]" />
                          <span
                            aria-hidden="true"
                            className="relative h-[42%] w-[42%] rotate-45 rounded-[2px] border border-white/80 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                          />
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mt-3 rounded-[1.5rem] bg-white/80 p-4 shadow-inner">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-base font-black text-gray-800">
                  Book {String(selectedStop.id).padStart(2, "0")}
                </span>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-black text-emerald-800">
                  盾牌 {selectedShieldCount}/{SHIELDS_PER_STOP}
                </span>
                {selectedNotes.length > 0 ? (
                  selectedNotes.map((note, index) => (
                    <span
                      className={`max-w-full whitespace-pre-wrap rounded-full border px-3 py-1.5 text-sm font-black leading-tight [overflow-wrap:anywhere] ${
                        noteToneClasses[index % noteToneClasses.length]
                      }`}
                      key={`${note}-${index}`}
                    >
                      <span
                        aria-hidden="true"
                        className="mr-1.5 inline-block h-2 w-2 rotate-45 rounded-[1px] border border-white/80 bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.75)]"
                      />
                      {note}
                    </span>
                  ))
                ) : (
                  <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-black text-gray-500">
                    暂无记录
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4 rounded-[2rem] bg-emerald-100 p-4 shadow-soft md:p-5">
          <div className="rounded-[1.5rem] bg-white/90 p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-black text-emerald-600">
                  Stop {String(selectedStop.id).padStart(2, "0")}
                </p>
                <div className="mt-1">
                  <div className="flex flex-wrap items-start gap-2">
                    <h2 className="text-3xl font-black leading-tight text-gray-950">
                      {selectedStop.title}
                    </h2>
                    <span className="mt-1 rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-black text-white shadow-soft">
                      跟书阅读
                    </span>
                    <button
                      className="mt-1 rounded-full bg-sky-500 px-3 py-1.5 text-sm font-black text-white shadow-soft transition hover:bg-sky-600 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
                      disabled={!selectedMediaAvailable}
                      onClick={playSelectedAudio}
                      type="button"
                    >
                      {selectedMediaAvailable ? "音频" : "音频待加入"}
                    </button>
                  </div>
                </div>
              </div>
              <div
                className={`rounded-2xl px-4 py-2 text-base font-black ${
                  selectedShieldCount > 0
                    ? "bg-amber-200 text-amber-950"
                    : "bg-emerald-100 text-emerald-900"
                }`}
              >
                {selectedShieldCount > 0 ? `${selectedShieldCount}/${SHIELDS_PER_STOP}` : "Quest"}
              </div>
            </div>

            {showAudioPlayer && (
              <div className="mt-3 w-full rounded-2xl bg-gray-100 px-4 py-3">
                <audio
                  ref={audioRef}
                  className="hidden"
                  key={selectedAudioUrl}
                  onEnded={() => setAudioIsPlaying(false)}
                  onError={() => setAudioIsPlaying(false)}
                  onLoadedMetadata={(event) => {
                    setAudioDuration(event.currentTarget.duration || 0);
                    setAudioCurrentTime(event.currentTarget.currentTime || 0);
                  }}
                  onPause={() => setAudioIsPlaying(false)}
                  onPlay={() => setAudioIsPlaying(true)}
                  onTimeUpdate={(event) => setAudioCurrentTime(event.currentTarget.currentTime || 0)}
                  preload="metadata"
                  src={selectedAudioUrl}
                >
                  当前浏览器不支持音频播放。
                </audio>
                <div className="flex items-center gap-3">
                  <button
                    aria-label={audioIsPlaying ? "暂停音频" : "播放音频"}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-lg font-black text-gray-950 shadow-sm transition active:scale-95"
                    onClick={toggleAudioPlayback}
                    type="button"
                  >
                    {audioIsPlaying ? "Ⅱ" : "▶"}
                  </button>
                  <div className="min-w-0 flex-1 text-sm font-black text-gray-800">
                    {formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}
                  </div>
                  <div className="ml-auto flex shrink-0 items-center gap-2">
                    <button
                      aria-label="后退 15 秒"
                      className="rounded-full bg-white px-3 py-1.5 text-sm font-black text-gray-800 shadow-sm transition active:scale-95"
                      onClick={() => skipAudio(-15)}
                      type="button"
                    >
                      -15s
                    </button>
                    <button
                      aria-label="快进 15 秒"
                      className="rounded-full bg-white px-3 py-1.5 text-sm font-black text-gray-800 shadow-sm transition active:scale-95"
                      onClick={() => skipAudio(15)}
                      type="button"
                    >
                      +15s
                    </button>
                  </div>
                </div>
                <input
                  aria-label="音频播放进度"
                  className="mt-3 block w-full accent-sky-500"
                  max={audioDuration || 0}
                  min={0}
                  onChange={(event) => seekAudio(Number(event.target.value))}
                  step={0.1}
                  type="range"
                  value={Math.min(audioCurrentTime, audioDuration || audioCurrentTime)}
                />
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-amber-100 px-4 py-3">
                <div className="text-sm font-black text-amber-700">Dragon Pass</div>
                <div className="text-3xl font-black text-amber-950">¥{selectedPassReward}</div>
              </div>
              <div className="rounded-2xl bg-emerald-100 px-4 py-3">
                <div className="text-sm font-black text-emerald-700">High Quality</div>
                <div className="text-3xl font-black text-emerald-950">+¥{selectedQualityBonus}</div>
              </div>
            </div>

            {selectedStop.milestone && (
              <div className="mt-3 rounded-2xl bg-rose-100 px-4 py-3 text-lg font-black text-rose-800">
                Milestone Gift：{selectedStop.milestone}
              </div>
            )}

            <form
              className="mt-5 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                addNote();
              }}
            >
              <label className="block">
                <span className="text-lg font-black leading-tight text-gray-800">阅读记录</span>
                <textarea
                  className="mt-2 min-h-28 w-full resize-none rounded-2xl border-4 border-emerald-100 bg-emerald-50 px-4 py-3 text-lg font-bold leading-snug text-gray-900 outline-none transition focus:border-emerald-400 focus:bg-white"
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="想到什么都可以记录：人物、剧情、Magic、问题、喜欢的一幕..."
                  value={noteDraft}
                />
              </label>
              <button
                className="min-h-14 rounded-3xl bg-emerald-500 px-5 py-3 text-xl font-black text-white shadow-soft transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!noteDraft.trim()}
                type="submit"
              >
                提交记录
              </button>
            </form>

            <div className="mt-4 grid gap-3">
              <GuideCard />
            </div>
          </div>

          {allComplete && (
            <div className="rounded-[1.5rem] bg-amber-200 p-5 text-center shadow-soft">
              <div className="text-5xl">🏰</div>
              <div className="mt-2 text-3xl font-black text-amber-950">Dragon Master!</div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function GuideCard() {
  return (
    <div className="rounded-2xl bg-white/80 px-4 py-3 shadow-inner">
      <div className="text-lg font-black text-gray-950">闯关指导</div>
      <div className="mt-2 grid gap-1.5">
        {guideItems.map((item) => (
          <div
            className={`flex gap-2 text-sm font-bold leading-snug ${
              item.tone === "required" ? "text-sky-700" : "text-emerald-700"
            }`}
            key={item.zh}
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                item.tone === "required" ? "bg-sky-400" : "bg-emerald-400"
              }`}
            />
            <span>
              <span className="font-black">{item.tone === "required" ? "必选" : "加分"}｜</span>
              {item.zh}
              <span className="mt-0.5 block font-black opacity-80">{item.en}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
