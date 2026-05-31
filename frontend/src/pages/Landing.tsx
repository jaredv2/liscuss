import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Credits } from "../components/Credits";
import { useLastfmAuth } from "../hooks/useLastfmAuth";
import { hasValidStoredSession } from "../lib/supabase";

export function Landing() {
  const navigate = useNavigate();
  const { login } = useLastfmAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (hasValidStoredSession()) {
      navigate("/home", { replace: true });
    }
  }, [navigate]);

  async function handleLogin() {
    try {
      setError(null);
      await login();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-4 py-8 text-center sm:px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-7xl">Liscuss</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-400 sm:mt-6 sm:text-lg sm:leading-8">
        Comment on the track you are listening to right now. Notes are shared with everyone on the track.
      </p>
      <button
        className="mt-8 w-full rounded-full bg-lastfm px-7 py-3 text-base font-bold text-white transition hover:bg-red-700 sm:mt-10 sm:w-auto"
        type="button"
        onClick={handleLogin}
      >
        Login with Last.fm
      </button>
      {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      <Credits />
    </main>
  );
}
