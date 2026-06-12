"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { FormField } from "@/components/FormField";
import { clearStoredToken, useAuthToken } from "@/lib/auth";
import { createRoom, getRooms, type Room } from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
  const token = useAuthToken();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  const [createSlug, setCreateSlug] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [joinSlug, setJoinSlug] = useState("");

  useEffect(() => {
    if (!token) return;
    getRooms(token)
      .then(({ rooms }) => setRooms(rooms))
      .catch((err) => setRoomsError(err instanceof Error ? err.message : "Something went wrong"))
      .finally(() => setLoading(false));
  }, [token]);

  function handleLogout() {
    clearStoredToken();
    router.push("/");
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token) return;

    setCreateError(null);
    setCreating(true);
    try {
      await createRoom({ slug: createSlug }, token);
      router.push(`/canvas/${encodeURIComponent(createSlug)}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Something went wrong");
      setCreating(false);
    }
  }

  function handleJoin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const slug = joinSlug.trim();
    if (!slug) return;
    router.push(`/canvas/${encodeURIComponent(slug)}`);
  }

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-black dark:text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <header className="border-b border-black/5 bg-white/80 backdrop-blur-sm dark:border-white/10 dark:bg-black/60">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Logo />
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">Your rooms</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Create a new canvas or join an existing one.</p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <form
            onSubmit={handleCreate}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Create a room</h2>
            <FormField label="Room name" value={createSlug} onChange={setCreateSlug} placeholder="team-standup" required />
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <button
              type="submit"
              disabled={creating}
              className="mt-1 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {creating ? "Creating…" : "Create & open"}
            </button>
          </form>

          <form
            onSubmit={handleJoin}
            className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Join a room</h2>
            <FormField label="Room name" value={joinSlug} onChange={setJoinSlug} placeholder="team-standup" required />
            <button
              type="submit"
              className="mt-1 rounded-full border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-white dark:hover:bg-zinc-900"
            >
              Open
            </button>
          </form>
        </div>

        <div className="mt-12">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Rooms you created</h2>
          {loading ? (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">Loading…</p>
          ) : roomsError ? (
            <p className="mt-4 text-sm text-red-600">{roomsError}</p>
          ) : rooms.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">No rooms yet — create one above.</p>
          ) : (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room) => (
                <li key={room.id}>
                  <Link
                    href={`/canvas/${encodeURIComponent(room.slug)}`}
                    className="block rounded-xl border border-zinc-200 bg-white p-4 transition-colors hover:border-indigo-200 hover:bg-indigo-50/40 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-indigo-900 dark:hover:bg-indigo-950/20"
                  >
                    <p className="font-medium text-zinc-900 dark:text-white">{room.slug}</p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Created {new Date(room.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
    </div>
  );
}
