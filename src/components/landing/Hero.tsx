import { useNavigate } from 'react-router-dom';

export function Hero() {
  const navigate = useNavigate();

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-stadium-glow" />
      <div className="pointer-events-none absolute inset-0 bg-pitch-lines opacity-50" />

      <div className="relative mx-auto flex min-h-[88vh] max-w-4xl flex-col items-center justify-center px-4 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-4xl shadow-glow animate-fade-up">
          🤡
        </div>

        <h1
          className="animate-fade-up font-display text-5xl font-bold tracking-tight text-chalk-100 sm:text-6xl md:text-7xl"
          style={{ animationDelay: '0.05s' }}
        >
          9 idiots <span className="text-turf-400">WC</span>
        </h1>

        <p
          className="mt-5 max-w-xl animate-fade-up text-lg text-chalk-300 sm:text-xl"
          style={{ animationDelay: '0.15s' }}
        >
          Predict every match. Talk trash. Find out who's the biggest idiot.
        </p>

        <button
          onClick={() => navigate('/join')}
          className="btn-primary mt-10 animate-fade-up px-10 py-4 text-lg"
          style={{ animationDelay: '0.25s' }}
        >
          Let's go
          <span aria-hidden>→</span>
        </button>

        <div
          className="mt-16 grid animate-fade-up grid-cols-3 gap-6 text-center sm:gap-12"
          style={{ animationDelay: '0.35s' }}
        >
          <Stat label="Exact score" value="+3 pts" />
          <Stat label="Correct result" value="+1 pt" />
          <Stat label="Live" value="Leaderboard" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-lg font-bold text-turf-400 sm:text-xl">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-chalk-500">{label}</div>
    </div>
  );
}
