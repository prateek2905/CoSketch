package main

import (
    "github.com/gorilla/websocket"
    "github.com/golang-jwt/jwt/v5"
    "github.com/jackc/pgx/v5"

	"fmt"
	"log"

	"cosketch/apps/ws-backend-go/internal/config"

	"net/http"
)

func main() {
    _ = jwt.RegisteredClaims{}
    _ = pgx.ConnConfig{}

	cfg := config.Load()

	mux := http.NewServeMux()

	var upgrader = websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request){
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request){
		conn, err := upgrader.Upgrade(w, r, nil)
		if(err != nil){
			log.Println("upgrade error:", err)
			return
		}

		defer conn.Close()

		for {
			mt, msg, err := conn.ReadMessage()
			if(err != nil){
				break
			}
			conn.WriteMessage(mt, msg)
		}
		
	})
	
	fmt.Println("listening on port:", cfg.Port)
	log.Fatal(http.ListenAndServe(":"+cfg.Port, mux))
}