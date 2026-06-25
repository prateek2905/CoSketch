package ws

import (
	"encoding/json"
	"errors"
)

type Point struct {
	X float64 `json:"x"`
}

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

type Inbound struct {
	Type    string  `json:"type"`
	RoomID  string  `json:"roomId"`
	Shape   *Shape  `json:"shape,omitempty"`
	ShapeID string  `json:"shapeId,omitempty"`
	X       float64 `json:"x"`
	Y       float64 `json:"y"`
}

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
	UserID int     `json:"userId"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
}

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