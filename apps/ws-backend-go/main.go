// Package main wires everything together: load config, open the DB pool, start
// the hub, and serve HTTP — a /healthz route and the WebSocket upgrade endpoint.
//
// Course reference: Day 1 (server skeleton) + Day 2 (auth in the upgrade handler)
// + Day 5 (DB pool) + Day 6 (PORT binding for coexistence/Render).
package main

import (
	"context"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v5/pgxpool"

	"cosketch/apps/ws-backend-go/internal/auth"
	"cosketch/apps/ws-backend-go/internal/config"
	"cosketch/apps/ws-backend-go/internal/store"
	"cosketch/apps/ws-backend-go/internal/ws"
)

// upgrader turns an incoming HTTP request into a WebSocket connection. CheckOrigin
// returns true here to allow any origin during development — same posture as the
// Node server's wide-open CORS. In production you'd restrict this to the known
// frontend origin(s).
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

func main() {
	cfg := config.Load()

	// pgxpool.New parses the DATABASE_URL and creates a connection pool (it does
	// NOT eagerly connect; the first query establishes a connection). We share one
	// pool across the whole process — the same singleton reasoning as the JS
	// `prismaClient`.
	pool, err := pgxpool.New(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to create db pool: %v", err)
	}
	defer pool.Close()

	// Build the hub and start its single owner-goroutine. Everything realtime flows
	// through this.
	hub := ws.NewHub(store.New(pool))
	go hub.Run()

	mux := http.NewServeMux()

	// Liveness probe. Render (and any orchestrator) hits a cheap endpoint to know
	// the process is up. Keeping it separate from "/" means health checks never
	// accidentally try to do a WebSocket upgrade.
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// IMPORTANT PARITY DETAIL: the frontend connects to `${WS_BASE_URL}?token=...`
	// with NO path (the Node `WebSocketServer({ port })` upgrades on the root). So
	// our upgrade handler must live on "/", not "/ws", or the existing client won't
	// reach it after you flip NEXT_PUBLIC_WS_BACKEND_URL. (More specific routes like
	// /healthz still win in Go's ServeMux, so they're unaffected.)
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		// --- AUTH BEFORE UPGRADE ---
		// We verify the JWT from the query string BEFORE upgrading. If it fails we
		// return a normal 401 and never spend resources on a socket. The token is in
		// the query string (not a header) because browsers can't set custom headers
		// on a WebSocket handshake.
		token := r.URL.Query().Get("token")
		userID, err := auth.VerifyToken(token, cfg.JWTSecret)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			// Upgrade already wrote an error response on failure; nothing else to do.
			return
		}

		// Hand the live connection to a Client, which registers with the hub and
		// starts its read/write pumps. From here the realtime protocol takes over.
		client := ws.NewClient(hub, conn, userID)
		client.Start()
	})

	// Bind to cfg.Port (default 8081, or Render's injected PORT). Binding to the
	// platform-provided PORT is mandatory on Render or the health check fails.
	addr := ":" + cfg.Port
	log.Printf("ws-backend-go listening on %s", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
