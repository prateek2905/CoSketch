import type { RawShape } from "./canvas/types";

export const API_BASE_URL = process.env.NEXT_PUBLIC_HTTP_BACKEND_URL ?? "http://localhost:3001";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? "Something went wrong");
  }
  return data as T;
}

async function getJson<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? "Something went wrong");
  }
  return data as T;
}

export function signin(input: { email: string; password: string }) {
  return postJson<{ token: string }>("/signin", input);
}

export function signup(input: { name: string; email: string; password: string }) {
  return postJson<{ userId: number }>("/signup", input);
}

export function forgotPassword(input: { email: string }) {
  return postJson<{ message: string }>("/forgot-password", input);
}

export function resetPassword(input: { token: string; password: string }) {
  return postJson<{ message: string }>("/reset-password", input);
}

export interface Room {
  id: number;
  slug: string;
  createdAt: string;
  adminId: number;
}

export function createRoom(input: { slug: string }, token: string) {
  return postAuthedJson<{ roomId: number }>("/room", input, token);
}

export function getRoom(slug: string, token: string) {
  return getJson<{ room: Room }>(`/room/${encodeURIComponent(slug)}`, token);
}

export function getRooms(token: string) {
  return getJson<{ rooms: Room[]; joinedRooms: (Room & { joinedAt: string })[] }>("/rooms", token);
}

export function getShapes(roomId: number, token: string) {
  return getJson<{ shapes: RawShape[] }>(`/shapes?roomId=${roomId}`, token);
}

async function postAuthedJson<T>(path: string, body: unknown, token: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message ?? "Something went wrong");
  }
  return data as T;
}
