import { BigButton } from "./BigButton";

type NumberPadProps = {
  value: string;
  locked?: boolean;
  onChange: (nextValue: string) => void;
  onSubmit: () => void;
};

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "清", "0", "退"];

export function NumberPad({ value, locked = false, onChange, onSubmit }: NumberPadProps) {
  const pressKey = (key: string) => {
    if (locked) return;
    if (key === "清") {
      onChange("");
      return;
    }
    if (key === "退") {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= 3) return;
    onChange(`${value}${key}`);
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {keys.map((key) => (
        <button
          key={key}
          className="h-[clamp(4.1rem,8.5vh,6.4rem)] rounded-2xl bg-white text-4xl font-black text-gray-800 shadow-soft transition active:scale-95 disabled:opacity-40"
          disabled={locked}
          type="button"
          onClick={() => pressKey(key)}
        >
          {key}
        </button>
      ))}
      <BigButton
        className="col-span-3 min-h-[clamp(4.6rem,9vh,6.6rem)] py-2 text-4xl"
        disabled={locked || value.length === 0}
        tone="mint"
        type="button"
        onClick={onSubmit}
      >
        ✓ 提交
      </BigButton>
    </div>
  );
}
