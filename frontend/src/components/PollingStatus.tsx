type Props = {
  status: "checking" | "playing" | "stopped" | "error";
  lastCheckedAt: Date | null;
  nextCheckAt: Date | null;
  onRefresh: () => void;
};

function formatTime(value: Date | null): string {
  if (!value) {
    return "not yet";
  }
  return value.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const labels = {
  checking: "Checking now",
  playing: "Fast polling active",
  stopped: "Waiting for playback",
  error: "Retrying after error",
};

export function PollingStatus({ status, lastCheckedAt, nextCheckAt, onRefresh }: Props) {
  const color = status === "error" ? "bg-red-400" : status === "playing" || status === "checking" ? "bg-lastfm" : "bg-zinc-500";

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-zinc-400 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-medium text-zinc-200">
            <span className={`h-2 w-2 rounded-full ${color}`} />
            <span>{labels[status]}</span>
          </div>
          <p className="mt-1 truncate">Last checked {formatTime(lastCheckedAt)} · next {formatTime(nextCheckAt)}</p>
        </div>
        <button
          className="w-full rounded-full border border-white/10 px-4 py-2 font-semibold text-white transition hover:border-lastfm hover:text-red-100 sm:w-auto"
          type="button"
          onClick={onRefresh}
        >
          Refresh now
        </button>
      </div>
    </section>
  );
}
