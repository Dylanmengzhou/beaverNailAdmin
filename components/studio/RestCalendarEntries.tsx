import { MoonStar } from "lucide-react";
import type { RestPerson } from "@/lib/studio/time-off-display";

function RestPeriod({ period }: { period: string }) {
  return (
    <small className="rest-cell-period">
      {period.split("–").map((part, index) => (
        <span key={index}>{index > 0 && <>–<wbr /></>}{part}</span>
      ))}
    </small>
  );
}

export function RestStoreEntry({ kind, period }: {
  kind: "closed" | "partial";
  period?: string;
}) {
  const label = kind === "closed" ? "全店休息" : "临时店休";
  return (
    <span className={`rest-cell-store is-${kind}`} title={period ? `${label} · ${period}` : label}>
      <MoonStar className="size-3" aria-hidden="true" />
      <span>{label}</span>
      {period && <RestPeriod period={period} />}
    </span>
  );
}

export function RestStaffEntry({ person }: { person: RestPerson }) {
  return (
    <span className="rest-cell-person" title={`${person.name}休息 · ${person.period} · ${person.reason}`}>
      <b>{person.name}休息</b>
      <RestPeriod period={person.period} />
    </span>
  );
}
