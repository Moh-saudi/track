function readAllowance(name: "SUBCOMMITTEE_SESSION_ALLOWANCE" | "SUPREME_SESSION_ALLOWANCE"): number {
  const raw = process.env[name];
  const value = raw ? Number(raw) : NaN;

  if (Number.isFinite(value) && value >= 0 && value <= 1_000_000) {
    return value;
  }

  if (process.env.NODE_ENV !== "production") {
    return name === "SUBCOMMITTEE_SESSION_ALLOWANCE" ? 5000 : 8000;
  }

  throw new Error(`${name} must be configured with an approved non-negative amount before production use`);
}

export function getApprovedAllowanceRates() {
  return {
    subcommittee: readAllowance("SUBCOMMITTEE_SESSION_ALLOWANCE"),
    supreme: readAllowance("SUPREME_SESSION_ALLOWANCE"),
  };
}
