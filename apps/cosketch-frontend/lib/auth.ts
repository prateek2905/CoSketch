"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

const TOKEN_KEY = "cosketch-token";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function getServerSnapshot(): string | null {
  return null;
}

/** Reactive, SSR-safe read of the stored auth token (re-syncs on cross-tab changes). */
export function useStoredToken(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Returns the stored auth token, redirecting to /signin if none is found.
 * Returns `undefined` until the client has hydrated and confirmed there's no token.
 */
export function useAuthToken(): string | undefined {
  const router = useRouter();
  const token = useStoredToken();

  useEffect(() => {
    if (token === null) {
      router.replace("/signin");
    }
  }, [token, router]);

  return token ?? undefined;
}
