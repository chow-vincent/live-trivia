import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles.css';

const APP_URL = 'https://app.hostedtrivia.com';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/play" element={<PlayRedirect />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <Comparison />
        <Testimonials />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}

/* ─── Play Redirect ───────────────────────────────────── */

function PlayRedirect() {
  const [gameCode, setGameCode] = useState('');
  const [displayName, setDisplayName] = useState('');

  const canSubmit = gameCode.trim().length > 0 && displayName.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const params = new URLSearchParams({
      code: gameCode.trim().toUpperCase(),
      name: displayName.trim(),
    });
    window.location.href = `${APP_URL}?${params.toString()}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-extrabold text-slate-900 text-center mb-1">
          Live Trivia
        </h1>
        <p className="text-slate-500 font-medium text-center mb-8">
          Join a Game
        </p>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5"
        >
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1.5">
              Game Code
            </label>
            <input
              type="text"
              placeholder="e.g. X7K2"
              value={gameCode}
              onChange={(e) => setGameCode(e.target.value.toUpperCase())}
              maxLength={5}
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 bg-slate-50 text-slate-900 text-center text-2xl font-bold tracking-[0.2em] placeholder:text-slate-300 placeholder:font-normal placeholder:text-lg placeholder:tracking-normal focus:outline-none focus:border-brand-300 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1.5">
              Your Name
            </label>
            <input
              type="text"
              placeholder="Enter your name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={30}
              className="w-full px-4 py-3.5 rounded-xl border-2 border-gray-200 bg-slate-50 text-slate-900 text-lg placeholder:text-slate-300 focus:outline-none focus:border-brand-300 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full py-3.5 rounded-xl bg-brand-300 text-slate-900 font-semibold text-lg hover:bg-brand-400 active:scale-[0.98] transition-all disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
          >
            Join Game
          </button>
        </form>

        <p className="mt-8 text-sm text-slate-400 text-center">
          Want to host?{' '}
          <a
            href={`${APP_URL}/sign-in`}
            className="text-brand-400 font-medium hover:text-brand-500"
          >
            Create a game
          </a>
        </p>
      </div>
    </div>
  );
}

/* ─── Nav ──────────────────────────────────────────────── */

function Nav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled ? 'bg-white/80 backdrop-blur-lg shadow-sm' : ''
      }`}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-xl font-extrabold text-slate-900">Live Trivia</span>
        <a
          href={`${APP_URL}/sign-in`}
          className="text-sm font-semibold text-slate-600 hover:text-brand-400 transition-colors"
        >
          Sign in
        </a>
      </div>
    </nav>
  );
}

/* ─── Hero ─────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="relative pt-28 pb-20 px-6">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 sm:text-6xl leading-[1.1]">
          Trivia that runs itself
        </h1>
        <p className="mt-6 text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
          Host live trivia with custom questions, real-time scoring, and zero
          setup. Players join with a code — no downloads, no sign-ups.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href={`${APP_URL}/sign-in`}
            className="rounded-xl bg-brand-300 px-8 py-3.5 text-base font-semibold text-slate-900 hover:bg-brand-400 active:scale-[0.98] transition-all"
          >
            Start hosting — it's free
          </a>
          <a
            href={APP_URL}
            className="rounded-xl border-2 border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            Join a game
          </a>
        </div>
      </div>

      {/* Video placeholder — swap with real demo footage later */}
      <div className="mx-auto mt-16 max-w-2xl">
        <div className="relative aspect-video rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex items-center justify-center cursor-pointer group">
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-full bg-brand-300 flex items-center justify-center group-hover:bg-brand-400 transition-colors">
              <svg className="w-6 h-6 text-slate-900 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-400">See it in action</span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ─────────────────────────────────────── */

function HowItWorks() {
  const steps = [
    {
      num: '1',
      title: 'Create your questions',
      desc: 'Free text, multiple choice, or ranking — mix and match however you like.',
    },
    {
      num: '2',
      title: 'Share the code',
      desc: 'Players open any browser, enter the 4-letter code, and they\'re in.',
    },
    {
      num: '3',
      title: 'Play live',
      desc: 'Scores update in real time. You control the pace. Results are instant.',
    },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-3xl font-extrabold text-center text-slate-900 mb-16">
          Three steps, zero friction
        </h2>
        <div className="grid gap-12 sm:grid-cols-3 sm:gap-8 relative">
          {/* Dashed connector line (desktop only) */}
          <div className="hidden sm:block absolute top-5 left-[calc(16.67%+20px)] right-[calc(16.67%+20px)] h-px border-t-2 border-dashed border-slate-200" />

          {steps.map((step) => (
            <div key={step.num} className="relative text-center">
              <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-brand-300 text-slate-900 text-sm font-bold relative z-10">
                {step.num}
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {step.title}
              </h3>
              <p className="text-slate-500 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Features ─────────────────────────────────────────── */

function Features() {
  const features = [
    {
      title: 'Any question type',
      desc: 'Free text, multiple choice, ranking — not just basic quizzes. Ask open-ended questions and grade answers on the fly.',
      align: 'left' as const,
    },
    {
      title: 'No app, no sign-up for players',
      desc: 'Players need a browser and a 4-letter code. That\'s the entire onboarding. Works on every phone, tablet, and laptop.',
      align: 'right' as const,
    },
    {
      title: 'You control the game',
      desc: 'Approve who joins, advance questions when you\'re ready, grade creative answers yourself. The host sets the pace.',
      align: 'left' as const,
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {features.map((f) => (
          <div
            key={f.title}
            className={`flex flex-col sm:flex-row items-start gap-6 rounded-2xl p-8 ${
              f.align === 'right'
                ? 'sm:flex-row-reverse bg-brand-50/60'
                : 'bg-white border border-gray-100'
            }`}
          >
            {/* Visual accent block */}
            <div
              className={`hidden sm:block w-1 self-stretch rounded-full shrink-0 ${
                f.align === 'right' ? 'bg-brand-200' : 'bg-brand-300'
              }`}
            />
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {f.title}
              </h3>
              <p className="text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Comparison ───────────────────────────────────────── */

function Comparison() {
  const rows = [
    { feature: 'Custom questions', us: 'Yes', them: 'Paid plans only' },
    { feature: 'Player sign-up required', us: 'No', them: 'Yes' },
    { feature: 'Real-time scoring', us: 'Yes', them: 'Manual or delayed' },
    { feature: 'Free-text answers', us: 'Yes', them: 'Multiple choice only' },
    { feature: 'Host controls pacing', us: 'Yes', them: 'Auto-advance' },
    { feature: 'Price', us: 'Free', them: 'Free tier limits' },
  ];

  return (
    <section className="bg-white py-24 px-6">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-3xl font-extrabold text-center text-slate-900 mb-4">
          Not another Kahoot clone
        </h2>
        <p className="text-center text-slate-500 mb-12 max-w-lg mx-auto">
          Built for hosts who want flexibility, not a dumbed-down quiz tool.
        </p>
        <div className="overflow-hidden rounded-2xl border border-gray-100">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50">
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 w-1/3" />
                <th className="px-6 py-4 text-sm font-bold text-brand-400">
                  Live Trivia
                </th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400">
                  Others
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.feature} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-3.5 text-sm font-medium text-slate-700">
                    {r.feature}
                  </td>
                  <td className="px-6 py-3.5 text-sm font-semibold text-emerald-600">
                    {r.us}
                  </td>
                  <td className="px-6 py-3.5 text-sm text-slate-400">
                    {r.them}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* ─── Testimonials ─────────────────────────────────────── */

function Testimonials() {
  const quotes = [
    {
      text: 'We switched from slides and spreadsheets. Now I just type my questions and hit go. The players love how fast it is.',
      name: 'Jamie R.',
      role: 'Bar trivia host',
    },
    {
      text: 'The fact that nobody has to download an app or create an account is huge. I had 40 people playing in under a minute.',
      name: 'Priya S.',
      role: 'Corporate event organizer',
    },
    {
      text: 'Open-ended questions changed the game for us. We can ask anything now, not just multiple choice.',
      name: 'Marcus T.',
      role: 'Teacher',
    },
  ];

  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-5xl">
        <h2 className="text-3xl font-extrabold text-center text-slate-900 mb-12">
          Hosts love it
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {quotes.map((q) => (
            <div
              key={q.name}
              className="rounded-2xl bg-white border border-gray-100 shadow-sm p-6 flex flex-col"
            >
              <span className="text-4xl font-extrabold text-brand-100 leading-none select-none">
                &ldquo;
              </span>
              <p className="mt-2 text-slate-600 leading-relaxed flex-1">
                {q.text}
              </p>
              <div className="mt-6 pt-4 border-t border-gray-100">
                <p className="text-sm font-bold text-slate-900">{q.name}</p>
                <p className="text-sm text-slate-400">{q.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Final CTA ────────────────────────────────────────── */

function FinalCTA() {
  return (
    <section className="bg-slate-900 py-20 px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-extrabold text-white mb-3">
          Ready to run your first game?
        </h2>
        <p className="text-slate-400 mb-8">
          Set up in under a minute. No credit card, no catch.
        </p>
        <a
          href={`${APP_URL}/sign-in`}
          className="inline-block rounded-xl bg-brand-300 px-8 py-3.5 text-base font-semibold text-slate-900 hover:bg-brand-400 active:scale-[0.98] transition-all"
        >
          Get started free
        </a>
      </div>
    </section>
  );
}

/* ─── Footer ───────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="py-8 px-6 text-center">
      <p className="text-sm text-slate-400">
        &copy; {new Date().getFullYear()} Live Trivia
      </p>
    </footer>
  );
}
