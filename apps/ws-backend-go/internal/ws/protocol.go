// Package ws contains the realtime engine: the wire protocol (this file), the
// hub that owns rooms (hub.go), and the per-connection read/write pumps
// (client.go).
//
// This file is the Go translation of packages/common/src/types.ts. Because Go
// can't import the TypeScript Zod schemas, these structs are HAND-MAINTAINED to
// match. That duplication is the single biggest cost of going polyglot, so the
// rule is: if you change a message in @repo/common, you change it here too.
//
// Course reference: Day 3 (all tasks).
package ws

import (
	"encoding/json"
	"errors"
)

// Point matches PointSchema in @repo/common. Field tags map Go's exported
// (capitalized) field names to the lowercase JSON keys the client sends.
type Point struct {
	X float64 `json:"x"`
	Y float64 `json:"y"`
}

// Shape matches ShapeSchema. Two important tag choices:
//   - `points,omitempty` so rectangles/ellipses (which have no points) don't
//     serialize an empty array back to clients.
//   - Text/FontSize/FontFamily are POINTERS (*string, *float64) so we can tell
//     "absent" (nil) from "present but zero/empty". A non-text shape has text=nil;
//     a JSON `null` and an omitted field both decode to nil. This mirrors how the
//     TS side treats these as `optional` (undefined), not as ""/0.
type Shape struct {
	ID              string   `json:"id"`
	Type            string   `json:"type"`
	X               float64  `json:"x"`
	Y               float64  `json:"y"`
	Width           float64  `json:"width"`
	Height          float64  `json:"height"`
	Angle           float64  `json:"angle"`
	StrokeColor     string   `json:"strokeColor"`
	BackgroundColor string   `json:"backgroundColor"`
	StrokeWidth     float64  `json:"strokeWidth"`
	StrokeStyle     string   `json:"strokeStyle"`
	FillStyle       string   `json:"fillStyle"`
	Opacity         float64  `json:"opacity"`
	Points          []Point  `json:"points,omitempty"`
	Text            *string  `json:"text,omitempty"`
	FontSize        *float64 `json:"fontSize,omitempty"`
	FontFamily      *string  `json:"fontFamily,omitempty"`
}

// Inbound is a single envelope that can represent ANY client->server message.
// The TS side uses a Zod discriminated union; Go's encoding/json has no such
// thing, so the idiomatic move is one struct with every possible field and a
// `Type` discriminator we switch on. Fields irrelevant to a given message type
// simply stay at their zero value.
//
// (An alternative — decode `type` first, then re-decode into a specific struct
// via json.RawMessage — is more "type-pure" but more verbose. For a handful of
// flat messages, the single-envelope approach is cleaner. Day 3 discusses both.)
type Inbound struct {
	Type    string  `json:"type"`
	RoomID  string  `json:"roomId"`
	Shape   *Shape  `json:"shape,omitempty"`
	ShapeID string  `json:"shapeId,omitempty"`
	X       float64 `json:"x"`
	Y       float64 `json:"y"`
}

// --- Outbound broadcast envelopes -------------------------------------------
// These are what the SERVER sends to clients. shape:create/update/delete echo
// the inbound payload, but cursor:move is special: the broadcast ADDS userId so
// peers know whose cursor moved. That extra field is exactly why the cursor
// broadcast is NOT part of the inbound schema, and why the frontend special-cases
// cursor:move before running its strict parser.

type ShapeBroadcast struct {
	Type   string `json:"type"`
	RoomID string `json:"roomId"`
	Shape  *Shape `json:"shape"`
}

type DeleteBroadcast struct {
	Type    string `json:"type"`
	RoomID  string `json:"roomId"`
	ShapeID string `json:"shapeId"`
}

type CursorBroadcast struct {
	Type   string  `json:"type"`
	RoomID string  `json:"roomId"`
	UserID int     `json:"userId"` // <-- added by the server, not sent by the client
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
}

// ParseInbound unmarshals + validates a raw frame. On any problem it returns an
// error and the caller silently drops the message (no error is sent back to the
// client) — same defensive behavior as the JS backend: a malformed/hostile frame
// must never crash the server or leak protocol details.
func ParseInbound(raw []byte) (*Inbound, error) {
	var in Inbound
	if err := json.Unmarshal(raw, &in); err != nil {
		return nil, err
	}
	if err := validateInbound(&in); err != nil {
		return nil, err
	}
	return &in, nil
}

func validateInbound(in *Inbound) error {
	switch in.Type {
	case "join_room", "leave_room", "cursor:move":
		if in.RoomID == "" {
			return errors.New("missing roomId")
		}
	case "shape:create", "shape:update":
		if in.RoomID == "" || in.Shape == nil {
			return errors.New("missing roomId or shape")
		}
		applyShapeDefaults(in.Shape)
		return validateShape(in.Shape)
	case "shape:delete":
		if in.RoomID == "" || in.ShapeID == "" {
			return errors.New("missing roomId or shapeId")
		}
	default:
		return errors.New("unknown message type")
	}
	return nil
}

// validateShape enforces the per-type required fields. This is the Go version of
// the Zod `.refine(...)` block in ShapeSchema: point-based shapes need >= 2
// points, text needs non-empty text. WITHOUT this, a client could send a "line"
// with no points and we'd persist/broadcast a shape that can't be drawn.
func validateShape(s *Shape) error {
	if s.ID == "" {
		return errors.New("shape missing id")
	}
	switch s.Type {
	case "rectangle", "ellipse":
		// defined purely by x/y/width/height — nothing extra required
	case "line", "arrow", "freedraw":
		if len(s.Points) < 2 {
			return errors.New("point-based shape needs at least 2 points")
		}
	case "text":
		if s.Text == nil || *s.Text == "" {
			return errors.New("text shape needs non-empty text")
		}
	default:
		return errors.New("unknown shape type")
	}
	return nil
}

// applyShapeDefaults fills the string defaults that Zod's `.default(...)` would
// apply when a client omits them. Our real client always sends full shapes, so
// this is belt-and-suspenders for protocol fidelity.
//
// NOTE (a real nuance to mention in interviews): numeric defaults like
// opacity=100 are NOT applied here, because Go's json can't distinguish "omitted"
// from "0" for a plain float64. Zod can, because it sees the key is absent. If we
// truly needed opacity-default parity we'd make Opacity a *float64. We don't,
// because the client always sends it.
func applyShapeDefaults(s *Shape) {
	if s.StrokeColor == "" {
		s.StrokeColor = "#1e1e1e"
	}
	if s.BackgroundColor == "" {
		s.BackgroundColor = "transparent"
	}
	if s.StrokeStyle == "" {
		s.StrokeStyle = "solid"
	}
	if s.FillStyle == "" {
		s.FillStyle = "hachure"
	}
}
