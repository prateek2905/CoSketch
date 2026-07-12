// hub.go — the central coordinator. This replaces the JS backend's shared
// `users[]` array plus the `broadcastToRoom` function.
//
// THE BIG IDEA (and the #1 interview point): in Node, a single shared mutable
// `users[]` array is safe ONLY because JS is single-threaded — two callbacks can
// never run at the same instant, so there are no data races. Go runs goroutines
// across multiple OS threads in parallel, so a shared map touched by many
// goroutines WOULD race. Instead of guarding it with a mutex, we give exactly ONE
// goroutine (Hub.Run) ownership of all shared state, and every other goroutine
// asks it to do things by sending on channels. This is Go's motto in action:
// "Do not communicate by sharing memory; share memory by communicating."
//
// Course reference: Day 4 (all tasks).
package ws

import (
	"context"
	"encoding/json"
	"log"
	"strconv"

	"cosketch/apps/ws-backend-go/internal/store"
)

// roomReq is "client X wants to join/leave room R". Sent by a client's readPump,
// applied by the hub goroutine (which is the only goroutine allowed to mutate a
// client's room set).
type roomReq struct {
	client *Client
	roomID string
}

// broadcastReq is "send these bytes to everyone in room R, optionally skipping
// one client". exclude is used for cursor:move so we don't echo your own cursor
// back to you.
type broadcastReq struct {
	roomID  string
	message []byte
	exclude *Client
}

// Hub owns all connection state. None of these maps/fields are touched by any
// goroutine other than the one running Hub.Run() — that invariant is what makes
// the whole thing race-free without locks.
type Hub struct {
	clients    map[*Client]bool // every connected client (the set we broadcast over)
	register   chan *Client
	unregister chan *Client
	join       chan roomReq
	leave      chan roomReq
	broadcast  chan broadcastReq
	store      *store.Store
}

func NewHub(s *store.Store) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		join:       make(chan roomReq),
		leave:      make(chan roomReq),
		broadcast:  make(chan broadcastReq, 256), // buffered: senders shouldn't block on a busy hub
		store:      s,
	}
}

// Run is the hub's event loop. You start it once with `go hub.Run()`. The single
// `select` is the entire concurrency model: whichever channel has work, we handle
// it; because only this goroutine ever reads/writes the maps below, no locks are
// needed.
func (h *Hub) Run() {
	for {
		select {
		case c := <-h.register:
			h.clients[c] = true

		case c := <-h.unregister:
			// Guarded delete: a client can be unregistered once. Closing c.send
			// signals its writePump to exit. (See the "slow consumer" branch in
			// broadcast, which can also unregister a client.)
			if _, ok := h.clients[c]; ok {
				delete(h.clients, c)
				close(c.send)
			}

		case r := <-h.join:
			r.client.rooms[r.roomID] = true

		case r := <-h.leave:
			delete(r.client.rooms, r.roomID)

		case req := <-h.broadcast:
			for c := range h.clients {
				if !c.rooms[req.roomID] {
					continue // not in this room
				}
				if req.exclude != nil && c == req.exclude {
					continue // skip the sender (used for cursor:move)
				}
				// Non-blocking send: if a client's send buffer is full it's a slow
				// or dead consumer. Rather than let one stuck client block the whole
				// hub, we drop it. This is a standard gorilla-hub safety valve.
				select {
				case c.send <- req.message:
				default:
					close(c.send)
					delete(h.clients, c)
				}
			}
		}
	}
}

// HandleMessage is called by a client's readPump (i.e. on the CLIENT's goroutine,
// not the hub's). It may safely: parse, validate, hit the database (the pool is
// concurrency-safe), and SEND on the hub's channels. It must NOT directly read or
// write h.clients or c.rooms — those belong to the hub goroutine. This separation
// is what keeps everything race-free.
func (h *Hub) HandleMessage(c *Client, raw []byte) {
	in, err := ParseInbound(raw)
	if err != nil {
		return // silently drop malformed/invalid frames
	}

	switch in.Type {
	case "join_room":
		h.join <- roomReq{client: c, roomID: in.RoomID}
	case "leave_room":
		h.leave <- roomReq{client: c, roomID: in.RoomID}
	case "shape:create":
		h.handleShapeCreate(c, in)
	case "shape:update":
		h.handleShapeUpdate(in)
	case "shape:delete":
		h.handleShapeDelete(in)
	case "cursor:move":
		h.handleCursorMove(c, in)
	}
}

func (h *Hub) handleShapeCreate(c *Client, in *Inbound) {
	roomID, err := strconv.Atoi(in.RoomID) // wire roomId is a string; DB FK is an int
	if err != nil {
		return
	}
	// PERSIST FIRST, then broadcast. If the DB write fails (e.g. duplicate id) we
	// return WITHOUT broadcasting, so clients never diverge from the database.
	// Note userID comes from the verified TOKEN (c.userID), never from the client
	// payload — so a user can't forge authorship of a shape.
	if err := h.store.CreateShape(context.Background(), toShapeInput(in.Shape, roomID, c.userID)); err != nil {
		log.Printf("shape:create persist failed: %v", err)
		return
	}
	msg, _ := json.Marshal(ShapeBroadcast{Type: "shape:create", RoomID: in.RoomID, Shape: in.Shape})
	h.broadcast <- broadcastReq{roomID: in.RoomID, message: msg}
}

func (h *Hub) handleShapeUpdate(in *Inbound) {
	if err := h.store.UpdateShape(context.Background(), toShapeInput(in.Shape, 0, 0)); err != nil {
		log.Printf("shape:update persist failed: %v", err)
		return
	}
	msg, _ := json.Marshal(ShapeBroadcast{Type: "shape:update", RoomID: in.RoomID, Shape: in.Shape})
	h.broadcast <- broadcastReq{roomID: in.RoomID, message: msg}
}

func (h *Hub) handleShapeDelete(in *Inbound) {
	if err := h.store.SoftDeleteShape(context.Background(), in.ShapeID); err != nil {
		log.Printf("shape:delete persist failed: %v", err)
		return
	}
	msg, _ := json.Marshal(DeleteBroadcast{Type: "shape:delete", RoomID: in.RoomID, ShapeID: in.ShapeID})
	h.broadcast <- broadcastReq{roomID: in.RoomID, message: msg}
}

func (h *Hub) handleCursorMove(c *Client, in *Inbound) {
	// Cursor moves are NEVER persisted — they're pure ephemeral presence. Writing
	// every mouse move to Postgres would be enormous write volume for data nobody
	// needs a moment later. We only relay. We add userId (so peers can label/color
	// the cursor) and exclude the sender (you don't need your own cursor echoed).
	msg, _ := json.Marshal(CursorBroadcast{
		Type:   "cursor:move",
		RoomID: in.RoomID,
		UserID: c.userID,
		X:      in.X,
		Y:      in.Y,
	})
	h.broadcast <- broadcastReq{roomID: in.RoomID, message: msg, exclude: c}
}

// toShapeInput translates the wire Shape into the persistence-layer ShapeInput,
// marshaling the points slice to JSON bytes (or nil). roomID/userID are only used
// by create; update/delete pass 0 because those columns are immutable.
func toShapeInput(s *Shape, roomID, userID int) store.ShapeInput {
	var points []byte
	if len(s.Points) > 0 {
		points, _ = json.Marshal(s.Points)
	}
	return store.ShapeInput{
		ID: s.ID, RoomID: roomID, UserID: userID, Type: s.Type,
		X: s.X, Y: s.Y, Width: s.Width, Height: s.Height, Angle: s.Angle,
		StrokeColor: s.StrokeColor, BackgroundColor: s.BackgroundColor,
		StrokeWidth: s.StrokeWidth, StrokeStyle: s.StrokeStyle, FillStyle: s.FillStyle,
		Opacity: s.Opacity, Points: points,
		Text: s.Text, FontSize: s.FontSize, FontFamily: s.FontFamily,
	}
}
