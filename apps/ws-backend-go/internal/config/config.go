// Package config centralizes all environment-driven configuration so the rest
// of the program never reads process env directly. This mirrors the JS
// `@repo/backend-common` package, which exists for the same reason: ONE place
// that decides how env vars are read, so the HTTP backend and the WS backend
// (and now this Go service) can't disagree about, e.g., JWT_SECRET.
//
// Course reference: Day 1, Task 1.3.
package config

import "os"

// Config holds every value this service needs to boot. Keeping it as a struct
// (instead of reading os.Getenv scattered everywhere) makes the dependencies of
// the program explicit and trivially testable — you can construct a Config in a
// test without touching the real environment.
type Config struct {
	// Port the HTTP/WebSocket server listens on. Default 8081 so this service
	// can run side-by-side with the Node ws-backend (which uses 8080) during the
	// A/B period. On Render, the platform injects PORT and REQUIRES us to bind to
	// it, which is exactly why we read it from the environment.
	Port string

	// JWTSecret MUST be identical to the secret the Node http-backend signs
	// tokens with. That shared secret is the whole reason a token minted by the
	// HTTP login can be verified here in a *different process and language*.
	JWTSecret string

	// DatabaseURL is the Postgres connection string. We read/write the SAME
	// database the Node services use; Prisma remains the schema owner.
	DatabaseURL string
}

// Load reads the configuration from the environment, applying sensible local
// defaults. We deliberately DO NOT crash on a missing JWT_SECRET here (we fall
// back to "secret") so local dev boots with zero setup — exactly like the JS
// `@repo/backend-common`. In a hardened production build you'd fail-fast instead.
func Load() Config {
	return Config{
		Port:        getEnv("PORT", "8081"),
		JWTSecret:   getEnv("JWT_SECRET", "secret"),
		DatabaseURL: os.Getenv("DATABASE_URL"), // no sane default — must be set
	}
}

// getEnv returns the env var if it's set AND non-empty, otherwise the fallback.
// We treat empty-string as "unset" because Render/Docker often inject empty vars.
func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
