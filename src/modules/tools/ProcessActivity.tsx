import type { MouseEvent } from "react";
import type { Dispatch } from "react";
import type { IslandEvent } from "../../machine/island-machine";
import { useT } from "../../i18n";

function elapsed(seconds: number) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function ProcessActivity({ recording, seconds, shares, dispatch }: {
  recording: boolean;
  seconds: number;
  shares: number;
  dispatch: Dispatch<IslandEvent>;
}) {
  const t = useT();
  const open = (tab: "tools" | "shelf") => (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    dispatch({ type: "press" });
    dispatch({ type: "tab.select", tab });
  };
  return (
    <div className="process-activity">
      {recording && <button type="button" className="process-activity-item" aria-label={t.capture.activityLabel} title={t.capture.activityLabel} onClick={open("tools")}><i className="process-dot process-dot--recording" /><span>{elapsed(seconds)}</span></button>}
      {shares > 0 && <button type="button" className="process-activity-item" aria-label={t.phone.activityLabel} title={t.phone.activityLabel} onClick={open("shelf")}><i className="process-dot process-dot--sharing" /><span>{t.phone.activeShares(shares)}</span></button>}
    </div>
  );
}
