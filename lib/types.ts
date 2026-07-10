export type GameMode = "within20" | "twoDigit" | "mixed";

export type Player = "dad" | "daughter";

export type Question = {
  id: string;
  left: number;
  right: number;
  operator: "+" | "-";
  answer: number;
};

export type WrongQuestion = {
  id: string;
  question: string;
  correctAnswer: string;
  userAnswer: string;
  createdAt: string;
  mastered: boolean;
};

export type Stats = {
  medals: number;
  stars: number;
  totalMatches: number;
  totalQuestions: number;
  daughterCorrect: number;
  daughterAttempts: number;
  fastestAnswerSec: number | null;
  winStreak: number;
  wrongBook: WrongQuestion[];
};

export type GameResult = {
  dadScore: number;
  daughterScore: number;
  medalGain: number;
  starGain: number;
  questionCount: number;
  winner: "爸爸" | "女儿" | "平局";
  perfectDaughter: boolean;
};
