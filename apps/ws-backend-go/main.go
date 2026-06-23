package main

import (
    "github.com/gorilla/websocket"
    "github.com/golang-jwt/jwt/v5"
    "github.com/jackc/pgx/v5"

	"fmt"

	"cosketch/apps/ws-backend-go/internal/config"
	"cosketch/apps/ws-backend-go/internal/auth"
	"cosketch/apps/ws-backend-go/internal/store"
	"cosketch/apps/ws-backend-go/internal/ws"

	"net/http"
)

func main() {
    _ = websocket.DefaultDialer
    _ = jwt.RegisteredClaims{}
    _ = pgx.ConnConfig{}

	cfg := config.Load()

	mux = http.NewServeMux()

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request){
		w.WriteHeader(http.StatusOK)
		_, _ := w.Write([]byte("ok"))
	})
}