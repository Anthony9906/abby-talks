type StatPillProps = {
  label: string;
  value: string | number;
};

export function StatPill({ label, value }: StatPillProps) {
  return (
    <div className="rounded-2xl bg-white/90 px-5 py-3 text-center shadow-soft">
      <div className="text-sm font-bold text-gray-500">{label}</div>
      <div className="text-2xl font-black text-gray-900">{value}</div>
    </div>
  );
}
