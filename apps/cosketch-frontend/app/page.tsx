import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CanvasPreview } from "@/components/CanvasPreview";
import { ChatIcon, LinkIcon, PencilIcon, UsersIcon } from "@/components/icons";

const features = [
  {
    title: "Real-time collaboration",
    description: "See teammates' cursors and edits update live as everyone sketches on the same board.",
    icon: UsersIcon,
  },
  {
    title: "Hand-drawn aesthetic",
    description: "Rectangles, circles, arrows, and freehand strokes that feel natural and playful, not corporate.",
    icon: PencilIcon,
  },
  {
    title: "Shareable rooms",
    description: "Spin up a room, share the link, and start sketching with anyone in seconds.",
    icon: LinkIcon,
  },
  {
    title: "Built-in chat",
    description: "Discuss ideas right next to the canvas without switching to another app.",
    icon: ChatIcon,
  },
];

const steps = [
  {
    number: "01",
    title: "Create an account",
    description: "Sign up for free in a few seconds — no credit card required.",
  },
  {
    number: "02",
    title: "Start a room",
    description: "Create a sketching room and grab its shareable link.",
  },
  {
    number: "03",
    title: "Sketch together",
    description: "Invite your team and draw, write, and chat together in real time.",
  },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white dark:bg-black">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-6 pt-20 pb-24 text-center">
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1 text-sm font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
            Real-time collaborative whiteboard
          </span>
          <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-zinc-900 sm:text-6xl dark:text-white">
            Sketch ideas together, <span className="text-indigo-600">in real time</span>
          </h1>
          <p className="max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
            CoSketch is a collaborative whiteboard for sketching diagrams, wireframes, and ideas with your team —
            right in the browser.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="rounded-full bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-500"
            >
              Start sketching for free
            </Link>
            <Link
              href="/signin"
              className="rounded-full border border-zinc-300 px-8 py-3 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-900"
            >
              Sign in
            </Link>
          </div>

          {/* Canvas preview */}
          <div className="mt-8 w-full max-w-4xl overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl shadow-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center gap-1.5 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-yellow-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-3 text-xs text-zinc-400">cosketch.app/room/team-standup</span>
            </div>
            <CanvasPreview />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
              Everything you need to brainstorm visually
            </h2>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              A fast, lightweight canvas built for teams that think out loud.
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ title, description, icon: Icon }) => (
              <div
                key={title}
                className="rounded-2xl border border-zinc-200 p-6 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-zinc-800 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="border-t border-black/5 dark:border-white/10">
          <div className="mx-auto max-w-6xl px-6 py-24">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl dark:text-white">
                Up and running in under a minute
              </h2>
            </div>
            <div className="mt-16 grid gap-12 sm:grid-cols-3">
              {steps.map(({ number, title, description }) => (
                <div key={number} className="text-center sm:text-left">
                  <span className="text-sm font-semibold text-indigo-600">{number}</span>
                  <h3 className="mt-2 text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <div className="flex flex-col items-center gap-6 rounded-3xl bg-indigo-600 px-8 py-16 text-center text-white sm:px-16">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to start sketching?</h2>
            <p className="max-w-xl text-indigo-100">
              Create your free account and open your first board in under a minute.
            </p>
            <Link
              href="/signup"
              className="rounded-full bg-white px-8 py-3 text-base font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
            >
              Create your account
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
