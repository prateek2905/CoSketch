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

export function signin(input: { email: string; password: string }) {
  return postJson<{ token: string }>("/signin", input);
}

export function signup(input: { name: string; email: string; password: string }) {
  return postJson<{ userId: number }>("/signup", input);
}
