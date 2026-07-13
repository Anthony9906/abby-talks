export const roles = ["dad", "abby"] as const;

export type Role = (typeof roles)[number];

export const roleLabels: Record<Role, string> = {
  dad: "Dad",
  abby: "Abby",
};

export function parseRole(value: string | null | undefined): Role | null {
  return value === "dad" || value === "abby" ? value : null;
}

