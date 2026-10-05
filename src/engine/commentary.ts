import { formatINR } from "@/lib/money";

export function commentaryFor(input: {
  type: string;
  teamName?: string;
  playerName?: string;
  amount?: number;
  role?: string;
  remainingRole?: number;
  purse?: number;
  need?: number;
}): string {
  switch (input.type) {
    case "PLAYER_STARTED":
      return `${input.playerName} walks into the room. Base ${input.amount != null ? formatINR(input.amount) : ""}.`;
    case "BID":
      if (input.amount && input.amount >= 100_000_000) {
        return `That is a huge bid! ${input.teamName} go to ${formatINR(input.amount)}.`;
      }
      return `${input.teamName} bid ${input.amount != null ? formatINR(input.amount) : ""}.`;
    case "PASS":
      return `${input.teamName} step away.`;
    case "NEED":
      return `${input.teamName} clearly need a ${input.role?.toLowerCase()}.`;
    case "PURSE":
      return `${input.teamName} are running low on purse — ${input.purse != null ? formatINR(input.purse) : ""} left.`;
    case "SCARCITY":
      return `Only ${input.remainingRole} premium ${input.role} remain.`;
    case "PLAYER_SOLD":
      return `SOLD! ${input.playerName} to ${input.teamName} for ${input.amount != null ? formatINR(input.amount) : ""}.`;
    case "PLAYER_UNSOLD":
      return `${input.playerName} goes unsold.`;
    case "GOING_ONCE":
      return "Going once...";
    case "GOING_TWICE":
      return "Going twice...";
    default:
      return "";
  }
}
