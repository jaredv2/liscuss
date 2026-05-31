import { useState } from "react";
import { Link } from "react-router-dom";

type Props = {
  trackId: string;
};

export function TrackActions({ trackId }: Props) {
  const [copied, setCopied] = useState(false);
  const href = `/track/${encodeURIComponent(trackId)}`;

  async function copyLink() {
    const url = `${window.location.origin}${href}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:justify-end">
      <Link className="rounded-full border border-white/10 px-4 py-2 text-center text-sm font-semibold text-lastfm hover:border-lastfm/60" to={href}>
        Public page
      </Link>
      <button className="rounded-full border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-200 hover:border-lastfm/60" type="button" onClick={copyLink}>
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
