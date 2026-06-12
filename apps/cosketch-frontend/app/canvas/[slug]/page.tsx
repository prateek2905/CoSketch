"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuthToken } from "@/lib/auth";
import { getRoom, getShapes } from "@/lib/api";
import { fromRawShape, type Shape } from "@/lib/canvas/types";
import { CanvasBoard } from "@/components/canvas/CanvasBoard";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; roomId: number; shapes: Shape[] };

export default function CanvasPage() {
  const { slug } = useParams<{ slug: string }>();
  const token = useAuthToken();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const { room } = await getRoom(slug, token);
        const { shapes } = await getShapes(room.id, token);
        if (cancelled) return;
        setState({ status: "ready", roomId: room.id, shapes: shapes.map(fromRawShape) });
      } catch (err) {
        if (cancelled) return;
        setState({ status: "error", message: err instanceof Error ? err.message : "Something went wrong" });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, token]);

  if (!token || state.status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500 dark:bg-black dark:text-zinc-400">
        Loading canvas…
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center dark:bg-black">
        <p className="text-lg font-semibold text-zinc-900 dark:text-white">{state.message}</p>
        <Link
          href="/dashboard"
          className="rounded-full bg-indigo-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen">
      <CanvasBoard roomId={state.roomId} slug={slug} token={token} initialShapes={state.shapes} />
    </div>
  );
}
