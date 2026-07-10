import type { GameMode, Question, WrongQuestion } from "./types";

const randomInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const questionId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const formatQuestion = (question: Pick<Question, "left" | "operator" | "right">) =>
  `${question.left} ${question.operator} ${question.right}`;

const within20Question = (): Question => {
  const operator = Math.random() > 0.5 ? "+" : "-";

  if (operator === "+") {
    const left = randomInt(0, 20);
    const right = randomInt(0, 20 - left);

    return {
      id: questionId(),
      left,
      right,
      operator,
      answer: left + right,
    };
  }

  const left = randomInt(0, 20);
  const right = randomInt(0, left);

  return {
    id: questionId(),
    left,
    right,
    operator,
    answer: left - right,
  };
};

const twoDigitQuestion = (): Question => {
  const operator = Math.random() > 0.5 ? "+" : "-";

  if (operator === "+") {
    const left = randomInt(12, 89);
    const right = randomInt(10, 99);

    return {
      id: questionId(),
      left,
      right,
      operator,
      answer: left + right,
    };
  }

  const left = randomInt(30, 99);
  const right = randomInt(10, left - 1);

  return {
    id: questionId(),
    left,
    right,
    operator,
    answer: left - right,
  };
};

export const generateQuestion = (mode: GameMode): Question => {
  if (mode === "within20") return within20Question();
  if (mode === "twoDigit") return twoDigitQuestion();
  return Math.random() > 0.5 ? within20Question() : twoDigitQuestion();
};

export const generateQuestionSet = (mode: GameMode, count = 10) =>
  Array.from({ length: count }, () => generateQuestion(mode));

export const wrongToQuestion = (wrong: WrongQuestion): Question => {
  const compact = wrong.question.replace(/\s/g, "");
  const match = compact.match(/^(\d+)([+-])(\d+)$/);

  if (!match) {
    return {
      id: wrong.id,
      left: 0,
      right: 0,
      operator: "+",
      answer: Number(wrong.correctAnswer),
    };
  }

  return {
    id: wrong.id,
    left: Number(match[1]),
    operator: match[2] as "+" | "-",
    right: Number(match[3]),
    answer: Number(wrong.correctAnswer),
  };
};
