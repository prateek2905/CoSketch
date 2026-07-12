// client.go — one Client per WebSocket connection, with TWO goroutines:
//   - readPump:  the only goroutine that READS from the socket
//   - writePump: the only goroutine that WRITES to the socket
//
// WHY split reading and writing into two goroutines: the gorilla/websocket
// library permits AT MOST ONE concurrent reader and ONE concurrent writer per
// connection. By funneling every outbound message through a single `send` channel
// that only the writePump drains, we guarantee the "one writer" rule even though
// the hub may try to push messages to many clients at once. The readPump blocks
// on ReadMessage(), which is exactly what a dedicated goroutine is for.
//
// This is the standard gorilla "hub + client pumps" pattern. It's worth being
// able to draw it on a whiteboard.
//
// Course reference: Day 4, Tasks 4.2–4.4.
package ws

import (
	"time"

	"github.com/gorilla/websocket"
)

const (
	// writeWait: max time we allow for a single write before giving up.
	writeWait = 10 * time.Second
	// pongWait: if we don't hear a pong (or any message) within this window, the
	// connection is considered dead and the read deadline fires.
	pongWait = 60 * time.Second
	// pingPeriod: how often we proactively ping. Must be < pongWait so a pong has
	// time to come back before the deadline. 90% of pongWait is the usual choice.
	pingPeriod = (pongWait * 9) / 10
	// maxMessageSize: a hard cap so a malicious client can't send a giant frame to
	// exhaust memory. 1 MiB is generous for a shape.
	maxMessageSize = 1 << 20
)

// Client ties one socket to one authenticated user and the set of rooms that
// socket has joined. `send` is the per-client outbound queue (buffered so a brief
// slow write doesn't immediately drop the client). `rooms` is mutated ONLY by the
// hub goroutine (via join/leave), so it needs no lock.
type Client struct {
	hub    *Hub
	conn   *websocket.Conn
	send   chan []byte
	userID int
	rooms  map[string]bool
}

func NewClient(hub *Hub, conn *websocket.Conn, userID int) *Client {
	return &Client{
		hub:    hub,
		conn:   conn,
		send:   make(chan []byte, 256),
		userID: userID,
		rooms:  make(map[string]bool),
	}
}

// Start registers the client with the hub and launches its two pumps. Call this
// once, right after a successful auth + upgrade in main.go.
func (c *Client) Start() {
	c.hub.register <- c
	go c.writePump()
	go c.readPump()
}

// readPump is the blocking read loop. It owns the read side of the socket. When
// it returns (on any read error, including a normal close), the deferred cleanup
// unregisters the client from the hub and closes the connection — this is what
// keeps the hub's client set from leaking dead sockets (the Go equivalent of the
// JS `ws.on("close")` splice).
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	// Set the initial read deadline, and extend it every time we receive a pong.
	// Together with the writePump's pings, this is a heartbeat that detects and
	// reaps half-open connections (e.g. a laptop that slept).
	_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			break // client disconnected or sent a bad frame; cleanup runs via defer
		}
		// Hand the raw bytes to the hub's handler. Parsing/validation/DB writes all
		// happen on THIS goroutine; only shared-state mutations go through channels.
		c.hub.HandleMessage(c, message)
	}
}

// writePump is the only writer. It drains the `send` channel and also fires
// periodic pings. When the hub closes `send` (on unregister), the `ok == false`
// branch sends a clean close frame and exits.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed our send channel -> we've been unregistered.
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return // peer gone; stop pinging
			}
		}
	}
}
