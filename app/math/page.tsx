"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BigButton } from "@/components/BigButton";
import { NumberPad } from "@/components/NumberPad";
import { StatPill } from "@/components/StatPill";
import { clearLegacyStats, defaultStats, loadLegacyStats, loadStats, saveStats } from "@/lib/storage";
import { parseRole, roleLabels } from "@/lib/roles";
import type { GameMode, GameResult, Question, Stats, WrongQuestion } from "@/lib/types";
import { formatQuestion, generateQuestionSet, wrongToQuestion } from "@/lib/questions";

const DEFAULT_QUESTION_COUNT = 10;
const DEFAULT_QUESTION_SECONDS = 10;
const FEEDBACK_DELAY_MS = 1800;
const QUESTION_COUNT_OPTIONS = [5, 10, 20] as const;
const QUESTION_SECONDS_OPTIONS = [5, 10, 20] as const;

type View = "home" | "game" | "result" | "training" | "profile" | "wrongBook";

type MatchState = {
  questions: Question[];
  questionSeconds: number;
  index: number;
  timeLeft: number;
  dadInput: string;
  daughterInput: string;
  dadLocked: boolean;
  daughterLocked: boolean;
  dadSubmittedAt: number | null;
  daughterSubmittedAt: number | null;
  dadScore: number;
  daughterScore: number;
  wrongEntries: WrongQuestion[];
  fastestPlayerSec: number | null;
  roundStartedAt: number;
};

type TrainingState = {
  questions: Question[];
  questionSeconds: number;
  index: number;
  timeLeft: number;
  input: string;
  wrongCount: number;
  correctIds: string[];
  roundStartedAt: number;
};

type TrainingResult = {
  starGain: number;
  wrongCount: number;
} | null;

type RoundFeedback = {
  answer: number;
  dadCorrect: boolean;
  daughterCorrect: boolean;
} | null;

type RewardModalType = "medals" | "stars" | null;

const modeLabels: Record<GameMode, string> = {
  within20: "20以内",
  twoDigit: "两位数",
  mixed: "混合",
};

const todayText = () => new Date().toISOString().slice(0, 10);

const answerIsCorrect = (input: string, answer: number) => Number(input) === answer;

const roundToOne = (value: number) => Math.round(value * 10) / 10;

const formatRewardValue = (value: number) => roundToOne(value).toFixed(1);

const calculateTrainingStars = (correctCount: number) => roundToOne(correctCount * 0.2);

const updateFastest = (current: number | null, candidate: number | null) => {
  if (candidate === null) return current;
  if (current === null) return candidate;
  return Math.min(current, candidate);
};

export default function Home() {
  const searchParams = useSearchParams();
  const role = parseRole(searchParams.get("role"));
  const [view, setView] = useState<View>("home");
  const [mode, setMode] = useState<GameMode>("within20");
  const [questionCount, setQuestionCount] = useState<number>(DEFAULT_QUESTION_COUNT);
  const [questionSeconds, setQuestionSeconds] = useState<number>(DEFAULT_QUESTION_SECONDS);
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [match, setMatch] = useState<MatchState | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [training, setTraining] = useState<TrainingState | null>(null);
  const [trainingResult, setTrainingResult] = useState<TrainingResult>(null);
  const [roundFeedback, setRoundFeedback] = useState<RoundFeedback>(null);
  const [rewardModal, setRewardModal] = useState<RewardModalType>(null);
  const [dataReady, setDataReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"loading" | "saved" | "saving" | "error">("loading");
  const [unsavedStats, setUnsavedStats] = useState<Stats | null>(null);
  const advancingRef = useRef(false);
  const trainingAdvancingRef = useRef(false);

  useEffect(() => {
    if (!role) return;
    let cancelled = false;

    const load = async () => {
      setSyncStatus("loading");
      try {
        let remoteStats = await loadStats(role);
        const legacyStats = loadLegacyStats();
        const remoteIsEmpty = remoteStats.totalMatches === 0 && remoteStats.wrongBook.length === 0;
        if (
          legacyStats &&
          remoteIsEmpty &&
          window.confirm(`检测到这台设备上的旧数学记录，是否导入到 ${roleLabels[role]}？`)
        ) {
          remoteStats = await saveStats(role, legacyStats);
          clearLegacyStats();
        }
        if (!cancelled) {
          setStats(remoteStats);
          setSyncStatus("saved");
          setDataReady(true);
        }
      } catch {
        if (!cancelled) {
          setSyncStatus("error");
          setDataReady(false);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [role]);

  const persistStats = useCallback((nextStats: Stats) => {
    if (!role) return;
    setStats(nextStats);
    setUnsavedStats(nextStats);
    setSyncStatus("saving");
    void saveStats(role, nextStats)
      .then((saved) => {
        setStats(saved);
        setUnsavedStats(null);
        setSyncStatus("saved");
      })
      .catch(() => setSyncStatus("error"));
  }, [role]);

  const retrySave = () => {
    if (unsavedStats) persistStats(unsavedStats);
  };

  const startMatch = () => {
    advancingRef.current = false;
    setRoundFeedback(null);
    setResult(null);
    setMatch({
      questions: generateQuestionSet(mode, questionCount),
      questionSeconds,
      index: 0,
      timeLeft: questionSeconds,
      dadInput: "",
      daughterInput: "",
      dadLocked: false,
      daughterLocked: false,
      dadSubmittedAt: null,
      daughterSubmittedAt: null,
      dadScore: 0,
      daughterScore: 0,
      wrongEntries: [],
      fastestPlayerSec: null,
      roundStartedAt: Date.now(),
    });
    setView("game");
  };

  const submitPlayer = (player: "dad" | "daughter") => {
    setMatch((current) => {
      if (!current) return current;

      if (player === "dad") {
        return {
          ...current,
          dadLocked: true,
          dadSubmittedAt: current.dadSubmittedAt ?? Date.now(),
        };
      }

      return {
        ...current,
        daughterLocked: true,
        daughterSubmittedAt: current.daughterSubmittedAt ?? Date.now(),
      };
    });
  };

  const finishRound = useCallback(() => {
    if (!match || !role || advancingRef.current) return;
    advancingRef.current = true;

    const question = match.questions[match.index];
    const dadCorrect = answerIsCorrect(match.dadInput, question.answer);
    const daughterCorrect = answerIsCorrect(match.daughterInput, question.answer);
    const dadScore = match.dadScore + (dadCorrect ? 1 : 0);
    const daughterScore = match.daughterScore + (daughterCorrect ? 1 : 0);
    const selectedIsDad = role === "dad";
    const selectedCorrect = selectedIsDad ? dadCorrect : daughterCorrect;
    const selectedInput = selectedIsDad ? match.dadInput : match.daughterInput;
    const selectedSubmittedAt = selectedIsDad ? match.dadSubmittedAt : match.daughterSubmittedAt;
    const selectedScore = selectedIsDad ? dadScore : daughterScore;
    const selectedElapsed = selectedCorrect
      ? Number(
          (((selectedSubmittedAt ?? Date.now()) - match.roundStartedAt) / 1000).toFixed(1),
        )
      : null;
    const fastestPlayerSec = updateFastest(match.fastestPlayerSec, selectedElapsed);
    const wrongEntries = selectedCorrect
      ? match.wrongEntries
      : [
          ...match.wrongEntries,
          {
            id: `${role}-${question.id}-${Date.now()}`,
            question: formatQuestion(question),
            correctAnswer: String(question.answer),
            userAnswer: selectedInput || "空",
            createdAt: todayText(),
            mastered: false,
          },
        ];

    setRoundFeedback({ answer: question.answer, dadCorrect, daughterCorrect });

    const isLastQuestion = match.index === match.questions.length - 1;

    if (isLastQuestion) {
      const daughterWins = daughterScore > dadScore;
      const selectedWins = selectedIsDad ? dadScore > daughterScore : daughterWins;
      const questionTotal = match.questions.length;
      const perfectPlayer = selectedScore === questionTotal;
      const medalGain = (selectedWins ? 1 : 0) + (perfectPlayer ? 1 : 0);
      const gameResult: GameResult = {
        dadScore,
        daughterScore,
        medalGain,
        questionCount: questionTotal,
        starGain: 0,
        winner: daughterWins ? "女儿" : dadScore > daughterScore ? "爸爸" : "平局",
        perfectPlayer,
      };
      const nextStats: Stats = {
        ...stats,
        medals: stats.medals + medalGain,
        totalMatches: stats.totalMatches + 1,
        totalQuestions: stats.totalQuestions + questionTotal,
        correctAnswers: stats.correctAnswers + selectedScore,
        attempts: stats.attempts + questionTotal,
        fastestAnswerSec: updateFastest(stats.fastestAnswerSec, fastestPlayerSec),
        winStreak: selectedWins ? stats.winStreak + 1 : 0,
        wrongBook: [...stats.wrongBook, ...wrongEntries],
      };

      window.setTimeout(() => {
        persistStats(nextStats);
        setResult(gameResult);
        setMatch(null);
        setView("result");
        advancingRef.current = false;
      }, FEEDBACK_DELAY_MS);
      return;
    }

    window.setTimeout(() => {
      setMatch({
        ...match,
        index: match.index + 1,
        timeLeft: match.questionSeconds,
        dadInput: "",
        daughterInput: "",
        dadLocked: false,
        daughterLocked: false,
        dadSubmittedAt: null,
        daughterSubmittedAt: null,
        dadScore,
        daughterScore,
        wrongEntries,
        fastestPlayerSec,
        roundStartedAt: Date.now(),
      });
      setRoundFeedback(null);
      advancingRef.current = false;
    }, FEEDBACK_DELAY_MS);
  }, [match, persistStats, role, stats]);

  useEffect(() => {
    if (view !== "game" || !match) return;

    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        match.questionSeconds - Math.floor((Date.now() - match.roundStartedAt) / 1000),
      );
      setMatch((current) => (current ? { ...current, timeLeft: remaining } : current));
      if (remaining <= 0) finishRound();
    }, 200);

    return () => window.clearInterval(timer);
  }, [finishRound, match, view]);

  useEffect(() => {
    if (!match || view !== "game") return;
    if (match.dadLocked && match.daughterLocked) finishRound();
  }, [finishRound, match, view]);

  const startTraining = () => {
    trainingAdvancingRef.current = false;
    const pool = stats.wrongBook.filter((item) => !item.mastered);
    const questions = [...pool]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(5, pool.length))
      .map(wrongToQuestion);

    setTrainingResult(null);
    setTraining(
      questions.length
        ? {
            questions,
            questionSeconds,
            index: 0,
            timeLeft: questionSeconds,
            input: "",
            wrongCount: 0,
            correctIds: [],
            roundStartedAt: Date.now(),
          }
        : null,
    );
    setView("training");
  };

  const finishTrainingQuestion = useCallback((timedOut = false) => {
    if (!training) return;
    if (trainingAdvancingRef.current) return;
    trainingAdvancingRef.current = true;

    const question = training.questions[training.index];
    const correct = !timedOut && answerIsCorrect(training.input, question.answer);
    const wrongCount = training.wrongCount + (correct ? 0 : 1);
    const correctIds = correct ? [...training.correctIds, question.id] : training.correctIds;
    const isLast = training.index === training.questions.length - 1;

    if (!isLast) {
      setTraining({
        ...training,
        index: training.index + 1,
        timeLeft: training.questionSeconds,
        input: "",
        wrongCount,
        correctIds,
        roundStartedAt: Date.now(),
      });
      window.setTimeout(() => {
        trainingAdvancingRef.current = false;
      }, 0);
      return;
    }

    const masteredIds = new Set(correctIds);
    const starGain = calculateTrainingStars(correctIds.length);
    const nextStats = {
      ...stats,
      stars: roundToOne(stats.stars + starGain),
      wrongBook: stats.wrongBook.map((item) =>
        masteredIds.has(item.id) ? { ...item, mastered: true } : item,
      ),
    };

    persistStats(nextStats);
    setTrainingResult({ starGain, wrongCount });
    setTraining(null);
    window.setTimeout(() => {
      trainingAdvancingRef.current = false;
    }, 0);
  }, [persistStats, stats, training]);

  const submitTraining = () => finishTrainingQuestion(false);

  useEffect(() => {
    if (view !== "training" || !training || trainingResult) return;

    const timer = window.setInterval(() => {
      const remaining = Math.max(
        0,
        training.questionSeconds - Math.floor((Date.now() - training.roundStartedAt) / 1000),
      );
      setTraining((current) => (current ? { ...current, timeLeft: remaining } : current));
      if (remaining <= 0) finishTrainingQuestion(true);
    }, 200);

    return () => window.clearInterval(timer);
  }, [finishTrainingQuestion, training, trainingResult, view]);

  const accuracy = useMemo(() => {
    if (stats.attempts === 0) return "0%";
    return `${Math.round((stats.correctAnswers / stats.attempts) * 100)}%`;
  }, [stats.attempts, stats.correctAnswers]);

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

  if (!dataReady) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-soft">
          <h1 className="text-3xl font-black text-slate-950">
            {syncStatus === "error" ? "无法连接云端记录" : `正在加载 ${roleLabels[role]} 的记录…`}
          </h1>
          {syncStatus === "error" && (
            <button className="mt-5 rounded-full bg-teal-500 px-6 py-3 text-xl font-black text-white" onClick={() => window.location.reload()} type="button">
              重新连接
            </button>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-1 font-rounded md:p-2">
      {view === "home" && (
        <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col gap-5">
          <div className="rounded-[2rem] bg-white/85 p-6 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-lg font-black text-teal-600">Math Battle</p>
                <h1 className="mt-1 flex items-center gap-4 text-5xl font-black text-gray-900">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-4xl shadow-soft">
                    👨
                  </span>
                  <span>爸爸 VS 女儿数学大赛</span>
                  <span className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-4xl shadow-soft">
                    👧
                  </span>
                </h1>
              </div>
              <div className="flex min-w-64 flex-col gap-3">
                <div className="flex items-center justify-between rounded-2xl bg-teal-50 px-4 py-2 text-sm font-black text-teal-800">
                  <span>{roleLabels[role]}</span>
                  <button className="underline" onClick={syncStatus === "error" ? retrySave : undefined} type="button">
                    {syncStatus === "saving" ? "保存中…" : syncStatus === "error" ? "保存失败，重试" : "云端已保存"}
                  </button>
                </div>
                <Link
                  className="rounded-2xl bg-white/90 px-5 py-3 text-center text-lg font-black text-gray-800 shadow-soft transition active:scale-[0.98]"
                  href={`/games?role=${role}`}
                >
                  Game Hub
                </Link>
                <div className="grid grid-cols-2 gap-3">
                  <RewardStatButton
                    label="勋章"
                    value={formatRewardValue(stats.medals)}
                    icon="🎖"
                    onClick={() => setRewardModal("medals")}
                  />
                  <RewardStatButton
                    label="星星"
                    value={formatRewardValue(stats.stars)}
                    icon="⭐"
                    onClick={() => setRewardModal("stars")}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-[1.1fr_0.9fr] gap-5">
            <div className="rounded-[2rem] bg-sky-100 p-6 shadow-soft">
              <h2 className="text-3xl font-black text-gray-900">选择模式</h2>
              <div className="mt-5 grid grid-cols-3 gap-4">
                {(Object.keys(modeLabels) as GameMode[]).map((item) => (
                  <button
                    key={item}
                    className={`min-h-32 rounded-3xl border-4 p-4 text-2xl font-black shadow-soft transition active:scale-[0.98] ${
                      mode === item
                        ? "border-teal-500 bg-white text-teal-700"
                        : "border-white bg-white/70 text-gray-700"
                    }`}
                    type="button"
                    onClick={() => setMode(item)}
                  >
                    {modeLabels[item]}
                  </button>
                ))}
              </div>
              <div className="mt-6 grid grid-cols-2 gap-4">
                <SegmentedPicker
                  label="每局题数"
                  options={QUESTION_COUNT_OPTIONS}
                  suffix="题"
                  value={questionCount}
                  onChange={setQuestionCount}
                />
                <SegmentedPicker
                  label="每题秒数"
                  options={QUESTION_SECONDS_OPTIONS}
                  suffix="秒"
                  value={questionSeconds}
                  onChange={setQuestionSeconds}
                />
              </div>
            </div>

            <div className="grid gap-4 rounded-[2rem] bg-amber-100 p-6 shadow-soft">
              <BigButton className="text-3xl" tone="sun" onClick={startMatch}>
                🚀 开始比赛
              </BigButton>
              <BigButton className="text-3xl" tone="mint" onClick={startTraining}>
                🔐 秘密训练营
              </BigButton>
              <BigButton className="text-3xl" tone="sky" onClick={() => setView("profile")}>
                📈 成长档案
              </BigButton>
              <BigButton className="text-3xl" tone="white" onClick={() => setView("wrongBook")}>
                📒 错题本
              </BigButton>
            </div>
          </div>
        </section>
      )}

      {view === "game" && match && (
        <GameView
          feedback={roundFeedback}
          match={match}
          setMatch={setMatch}
          submitPlayer={submitPlayer}
        />
      )}

      {view === "result" && result && (
        <ResultView profileName={roleLabels[role]} result={result} onHome={() => setView("home")} onAgain={startMatch} />
      )}

      {view === "training" && (
        <TrainingView
          result={trainingResult}
          training={training}
          setTraining={setTraining}
          onSubmit={submitTraining}
          onBack={() => setView("home")}
          onRestart={startTraining}
        />
      )}

      {view === "profile" && (
        <ProfileView accuracy={accuracy} stats={stats} onBack={() => setView("home")} />
      )}

      {view === "wrongBook" && (
        <WrongBookView stats={stats} onBack={() => setView("home")} onTrain={startTraining} />
      )}

      {rewardModal && (
        <RewardModal
          type={rewardModal}
          value={rewardModal === "medals" ? stats.medals : stats.stars}
          onClose={() => setRewardModal(null)}
        />
      )}
    </main>
  );
}

function SegmentedPicker({
  label,
  options,
  suffix,
  value,
  onChange,
}: {
  label: string;
  options: readonly number[];
  suffix: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-3xl bg-white/80 p-4 shadow-soft">
      <div className="mb-3 text-xl font-black text-gray-700">{label}</div>
      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option}
            className={`min-h-14 rounded-2xl text-2xl font-black transition active:scale-[0.98] ${
              value === option ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-700"
            }`}
            type="button"
            onClick={() => onChange(option)}
          >
            {option}
            {suffix}
          </button>
        ))}
      </div>
    </div>
  );
}

function RewardStatButton({
  icon,
  label,
  value,
  onClick,
}: {
  icon: string;
  label: string;
  value: string;
  onClick: () => void;
}) {
  return (
    <button
      className="rounded-2xl bg-white/90 px-5 py-3 text-center shadow-soft transition active:scale-[0.98]"
      type="button"
      onClick={onClick}
    >
      <div className="text-sm font-bold text-gray-500">{label}</div>
      <div className="text-2xl font-black text-gray-900">
        {icon} {value}
      </div>
    </button>
  );
}

function RewardModal({
  type,
  value,
  onClose,
}: {
  type: Exclude<RewardModalType, null>;
  value: number;
  onClose: () => void;
}) {
  const rewardText = type === "medals" ? "10个🎖 = 100元" : "10个⭐ = 1个玩具";
  const icon = type === "medals" ? "🎖" : "⭐";
  const label = type === "medals" ? "勋章奖励" : "星星奖励";
  const unitLabel = type === "medals" ? "勋章" : "星星";
  const normalizedValue = roundToOne(value);
  const giftCount = type === "stars" ? Math.floor(normalizedValue / 10) : 0;
  const progress =
    type === "stars"
      ? roundToOne(normalizedValue % 10)
      : normalizedValue > 10
        ? roundToOne(normalizedValue % 10)
        : Math.min(normalizedValue, 10);
  const progressPercent = Math.min(100, (progress / 10) * 100);
  const showCumulative = type === "stars" ? giftCount > 0 : normalizedValue > 10;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/35 p-6">
      <div className="w-full max-w-xl rounded-[2rem] bg-white p-7 text-center shadow-soft">
        <div className="text-5xl font-black text-gray-900">
          {icon} {label}
        </div>
        <div className="mt-5 rounded-3xl bg-amber-100 px-5 py-4 text-3xl font-black text-amber-900">
          {rewardText}
        </div>
        {showCumulative && (
          <div className="mt-6 text-2xl font-black text-teal-700">
            累计{unitLabel} {icon} {formatRewardValue(normalizedValue)}
          </div>
        )}
        {type === "stars" && giftCount > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2 text-4xl" aria-label={`已兑换 ${giftCount} 个礼物`}>
            {Array.from({ length: giftCount }, (_, index) => (
              <span key={index}>🎁</span>
            ))}
          </div>
        )}
        <div className={showCumulative ? "mt-3 text-2xl font-black text-gray-700" : "mt-6 text-2xl font-black text-gray-700"}>
          当前进度 {formatRewardValue(progress)}/10.0
        </div>
        {type === "stars" ? (
          <StarProgress value={progress} />
        ) : (
          <div className="mt-4 h-12 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-inner">
            <div
              className="h-full rounded-full bg-teal-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
        <BigButton className="mt-7 w-full" tone="sky" onClick={onClose}>
          知道了
        </BigButton>
      </div>
    </div>
  );
}

function StarProgress({ value }: { value: number }) {
  return (
    <div className="mt-4 grid grid-cols-10 gap-1 rounded-3xl bg-amber-50 px-3 py-3 shadow-inner">
      {Array.from({ length: 10 }, (_, index) => {
        const fill = Math.max(0, Math.min(1, value - index));

        return (
          <div
            key={index}
            className="flex h-10 items-center justify-center text-3xl leading-10"
            aria-hidden="true"
          >
            <span className="relative inline-block h-[1.25em] w-[1.25em] overflow-hidden">
              <span className="absolute left-0 top-0 opacity-40" style={{ filter: "grayscale(1)" }}>
                ⭐️
              </span>
              <span
                className="absolute left-0 top-0 overflow-hidden whitespace-nowrap"
                style={{ width: `${fill * 100}%` }}
              >
                ⭐️
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TrainingStarProgress({ value }: { value: number }) {
  const fill = Math.max(0, Math.min(1, value));

  return (
    <div className="mx-auto mt-5 flex items-center gap-4 rounded-3xl bg-teal-50 px-6 py-3 text-teal-700">
      <span className="text-3xl font-black">本轮星星</span>
      <span className="relative inline-block h-[1.35em] w-[1.35em] overflow-hidden text-5xl leading-none">
        <span className="absolute left-0 top-0 opacity-40" style={{ filter: "grayscale(1)" }}>
          ⭐️
        </span>
        <span
          className="absolute left-0 top-0 overflow-hidden whitespace-nowrap"
          style={{ width: `${fill * 100}%` }}
        >
          ⭐️
        </span>
      </span>
      <span className="text-4xl font-black">{formatRewardValue(value)}</span>
    </div>
  );
}

function GameView({
  feedback,
  match,
  setMatch,
  submitPlayer,
}: {
  feedback: RoundFeedback;
  match: MatchState;
  setMatch: React.Dispatch<React.SetStateAction<MatchState | null>>;
  submitPlayer: (player: "dad" | "daughter") => void;
}) {
  const question = match.questions[match.index];

  return (
    <section className="mx-auto grid min-h-[calc(100vh-0.5rem)] max-w-7xl grid-rows-[auto_auto_1fr] gap-2">
      <div className="flex items-center justify-between rounded-[2rem] bg-white/90 px-6 py-1 shadow-soft">
        <div className="text-2xl font-black text-gray-900">
          第 {match.index + 1} 题 / {match.questions.length}
        </div>
        <div className="rounded-3xl bg-rose-100 px-6 py-1 text-2xl font-black text-rose-600">
          ⏰ {String(match.timeLeft).padStart(2, "0")} 秒
        </div>
      </div>

      <div className="rounded-[2rem] bg-white/90 px-6 py-2 text-center shadow-soft">
        <div className="flex items-center justify-center gap-5 text-[clamp(3.4rem,7.8vh,5rem)] font-black text-gray-950">
          <span>{formatQuestion(question)} =</span>
          <span
            className={`flex h-[clamp(4rem,8.5vh,6rem)] min-w-[clamp(4rem,8.5vh,6rem)] items-center justify-center rounded-2xl border-4 px-4 ${
              feedback
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-rose-400 bg-white text-gray-950"
            }`}
          >
            {feedback ? feedback.answer : "?"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <PlayerPanel
          answer={match.dadInput}
          avatar="👨"
          feedback={feedback ? feedback.dadCorrect : null}
          locked={match.dadLocked}
          name="Anthony"
          roleName="爸爸"
          score={match.dadScore}
          tone="sky"
          onAnswer={(value) => setMatch((current) => (current ? { ...current, dadInput: value } : current))}
          onSubmit={() => submitPlayer("dad")}
        />
        <PlayerPanel
          answer={match.daughterInput}
          avatar="👧"
          feedback={feedback ? feedback.daughterCorrect : null}
          locked={match.daughterLocked}
          name="Abby"
          roleName="女儿"
          score={match.daughterScore}
          tone="rose"
          onAnswer={(value) =>
            setMatch((current) => (current ? { ...current, daughterInput: value } : current))
          }
          onSubmit={() => submitPlayer("daughter")}
        />
      </div>
    </section>
  );
}

function PlayerPanel({
  answer,
  avatar,
  feedback,
  locked,
  name,
  roleName,
  score,
  tone,
  onAnswer,
  onSubmit,
}: {
  answer: string;
  avatar: string;
  feedback: boolean | null;
  locked: boolean;
  name: string;
  roleName: string;
  score: number;
  tone: "sky" | "rose";
  onAnswer: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className={`rounded-[2rem] p-3 shadow-soft ${tone === "sky" ? "bg-sky-100" : "bg-rose-100"}`}>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-3xl shadow-soft">
            {avatar}
          </div>
          <div className="leading-tight">
            <div className="text-base font-black text-gray-500">{roleName}</div>
            <h2 className="text-3xl font-black text-gray-900">{name}</h2>
          </div>
        </div>

        <div className="flex h-12 w-36 items-center justify-center rounded-2xl bg-white/70 shadow-inner">
          {feedback !== null && (
            <span
              aria-label={feedback ? "答对" : "答错"}
              className={`text-5xl font-black ${feedback ? "text-emerald-500" : "text-rose-500"}`}
            >
              {feedback ? "✓" : "×"}
            </span>
          )}
        </div>

        <div className="justify-self-end rounded-3xl bg-white px-5 py-2 text-2xl font-black text-gray-900">
          {score} 分
        </div>
      </div>
      <div className="my-2 flex h-14 items-center justify-center rounded-3xl bg-white text-5xl font-black text-gray-900 shadow-inner">
        {answer || "?"}
      </div>
      <NumberPad locked={locked} value={answer} onChange={onAnswer} onSubmit={onSubmit} />
    </div>
  );
}

function ResultView({
  result,
  profileName,
  onHome,
  onAgain,
}: {
  result: GameResult;
  profileName: string;
  onHome: () => void;
  onAgain: () => void;
}) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-4xl flex-col justify-center gap-5 text-center">
      <div className="rounded-[2rem] bg-white/90 p-8 shadow-soft">
        <div className="text-6xl font-black">🎉 比赛结束</div>
        <div className="mt-5 text-5xl font-black text-teal-700">冠军：{result.winner}</div>
        <div className="mt-6 grid grid-cols-2 gap-4">
          <StatPill label="爸爸" value={`${result.dadScore}/${result.questionCount}`} />
          <StatPill label="女儿" value={`${result.daughterScore}/${result.questionCount}`} />
        </div>
        <div className="mt-6 text-4xl font-black text-amber-700">🏅 +{result.medalGain}</div>
        {result.perfectPlayer && (
          <div className="mt-2 text-2xl font-black text-rose-600">{profileName} 全对，额外勋章！</div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <BigButton tone="white" onClick={onHome}>
          回首页
        </BigButton>
        <BigButton tone="sun" onClick={onAgain}>
          再来一局
        </BigButton>
      </div>
    </section>
  );
}

function TrainingView({
  training,
  result,
  setTraining,
  onSubmit,
  onBack,
  onRestart,
}: {
  training: TrainingState | null;
  result: TrainingResult;
  setTraining: React.Dispatch<React.SetStateAction<TrainingState | null>>;
  onSubmit: () => void;
  onBack: () => void;
  onRestart: () => void;
}) {
  if (result) {
    const perfect = result.wrongCount === 0;
    return (
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl flex-col justify-center gap-5 text-center">
        <div className="rounded-[2rem] bg-white/90 p-8 shadow-soft">
          <div className="text-6xl font-black">{perfect ? "🎉 挑战成功" : "训练完成"}</div>
          <div className="mt-5 text-4xl font-black text-teal-700">
            ⭐ +{formatRewardValue(result.starGain)}
          </div>
          <div className="mt-3 text-2xl font-black text-gray-500">
            答错 {result.wrongCount} 题，每答对一题获得 0.2 星
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <BigButton tone="white" onClick={onBack}>
            回首页
          </BigButton>
          <BigButton tone="mint" onClick={onRestart}>
            继续训练
          </BigButton>
        </div>
      </section>
    );
  }

  if (!training) {
    return (
      <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-3xl flex-col justify-center gap-5 text-center">
        <div className="rounded-[2rem] bg-white/90 p-8 shadow-soft">
          <div className="text-6xl font-black">🔐 秘密训练营</div>
          <p className="mt-5 text-3xl font-black text-gray-700">现在没有错题</p>
        </div>
        <BigButton tone="white" onClick={onBack}>
          回首页
        </BigButton>
      </section>
    );
  }

  const question = training.questions[training.index];
  const progressPercent = ((training.index + 1) / training.questions.length) * 100;
  const currentTrainingStars = calculateTrainingStars(training.correctIds.length);

  return (
    <section className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-5xl grid-cols-[1fr_22rem] gap-5">
      <div className="flex flex-col justify-center rounded-[2rem] bg-white/90 p-8 text-center shadow-soft">
        <div className="flex items-center justify-center gap-4">
          <div className="text-4xl font-black text-teal-700">数学秘密训练营</div>
          <div className="rounded-3xl bg-rose-100 px-5 py-2 text-2xl font-black text-rose-600">
            ⏰ {String(training.timeLeft).padStart(2, "0")} 秒
          </div>
        </div>
        <div className="mt-8 text-7xl font-black text-gray-950">{formatQuestion(question)} = ?</div>
        <div className="mx-auto mt-8 flex h-24 w-72 items-center justify-center rounded-3xl bg-amber-100 text-6xl font-black text-gray-900">
          {training.input || "?"}
        </div>
        <TrainingStarProgress value={currentTrainingStars} />
        <div className="mx-auto mt-6 w-full max-w-md">
          <div className="mb-2 text-2xl font-black text-gray-500">
            第 {training.index + 1} 题 / {training.questions.length}
          </div>
          <div className="h-8 overflow-hidden rounded-full bg-gray-100 shadow-inner">
            <div
              className="h-full rounded-full bg-teal-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-center rounded-[2rem] bg-emerald-100 p-5 shadow-soft">
        <NumberPad
          value={training.input}
          onChange={(value) => setTraining((current) => (current ? { ...current, input: value } : current))}
          onSubmit={onSubmit}
        />
        <BigButton className="mt-4" tone="white" onClick={onBack}>
          回首页
        </BigButton>
      </div>
    </section>
  );
}

function ProfileView({
  stats,
  accuracy,
  onBack,
}: {
  stats: Stats;
  accuracy: string;
  onBack: () => void;
}) {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-5xl flex-col justify-center gap-5">
      <div className="rounded-[2rem] bg-white/90 p-8 shadow-soft">
        <h1 className="text-center text-6xl font-black text-gray-900">📈 成长档案</h1>
        <div className="mt-8 grid grid-cols-3 gap-4">
          <StatPill label="比赛场数" value={stats.totalMatches} />
          <StatPill label="勋章" value={`🏅 ${formatRewardValue(stats.medals)}`} />
          <StatPill label="星星" value={`⭐ ${formatRewardValue(stats.stars)}`} />
          <StatPill label="正确率" value={accuracy} />
          <StatPill label="最快答题" value={stats.fastestAnswerSec ? `${stats.fastestAnswerSec}s` : "-"} />
          <StatPill label="连续胜利" value={stats.winStreak} />
        </div>
      </div>
      <BigButton tone="white" onClick={onBack}>
        回首页
      </BigButton>
    </section>
  );
}

function WrongBookView({
  stats,
  onBack,
  onTrain,
}: {
  stats: Stats;
  onBack: () => void;
  onTrain: () => void;
}) {
  const items = stats.wrongBook.slice(-20).reverse();
  const activeCount = stats.wrongBook.filter((item) => !item.mastered).length;

  return (
    <section className="mx-auto flex min-h-[calc(100vh-2rem)] max-w-6xl flex-col gap-4">
      <div className="rounded-[2rem] bg-white/90 p-6 shadow-soft">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-5xl font-black text-gray-900">📒 错题本</h1>
            <p className="mt-2 text-xl font-bold text-gray-500">
              待练习 {activeCount} 题，最近显示 {items.length} 条
            </p>
          </div>
          <BigButton tone="mint" onClick={onTrain}>
            去训练
          </BigButton>
        </div>

        <div className="mt-5 overflow-hidden rounded-3xl border-4 border-amber-100 bg-white">
          {items.length === 0 && (
            <div className="bg-emerald-100 p-8 text-center text-3xl font-black text-emerald-800">
              还没有错题
            </div>
          )}
          {items.map((item) => (
            <div
              key={item.id}
              className="grid grid-cols-[1.1fr_1.5fr_1fr] items-center gap-4 border-b-2 border-amber-100 px-5 py-4 last:border-b-0"
            >
              <div>
                <div className="text-sm font-black text-gray-400">题目</div>
                <div className="text-3xl font-black text-gray-900">{item.question}</div>
              </div>
              <div>
                <div className="text-sm font-black text-gray-400">怎么错的</div>
                <div className="text-2xl font-black text-rose-600">
                  答成 {item.userAnswer}，正确是 {item.correctAnswer}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-black text-gray-400">怎么练</div>
                <div
                  className={`text-2xl font-black ${
                    item.mastered ? "text-emerald-600" : "text-teal-700"
                  }`}
                >
                  {item.mastered ? "已掌握" : "训练营抽题"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <BigButton tone="white" onClick={onBack}>
        回首页
      </BigButton>
    </section>
  );
}
