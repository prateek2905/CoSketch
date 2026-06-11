import Link from "next/link";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="border-t border-black/5 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-zinc-500 sm:flex-row dark:text-zinc-400">
        <Logo />
        <p>&copy; {new Date().getFullYear()} CoSketch. All rights reserved.</p>
        <div className="flex gap-6">
          <Link href="/signin" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
            Sign in
          </Link>
          <Link href="/signup" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
            Sign up
          </Link>
        </div>
      </div>
    </footer>
  );
}
