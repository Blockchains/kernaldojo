export type Evidence =
  | "CLAIMED"
  | "MEASURED"
  | "ESTIMATE"
  | "UNTESTED"
  | "UNVERIFIED"
  | "SIMULATED";

export const evidenceLabel: Record<Evidence, string> = {
  CLAIMED: "Claimed by source",
  MEASURED: "Measured",
  ESTIMATE: "Estimate",
  UNTESTED: "Untested here",
  UNVERIFIED: "Unverified",
  SIMULATED: "Simulated",
};
