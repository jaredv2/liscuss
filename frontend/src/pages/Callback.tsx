import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLastfmAuth } from "../hooks/useLastfmAuth";

export function Callback() {
  const navigate = useNavigate();
  const { completeCallback } = useLastfmAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      completeCallback();
      navigate("/home", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete login");
    }
  }, [completeCallback, navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center justify-center px-6">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
        <h1 className="text-2xl font-bold text-white">{error ? "Login failed" : "Completing login..."}</h1>
        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      </div>
    </main>
  );
}
