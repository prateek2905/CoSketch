// Package store is the persistence layer: it writes shapes to the SAME Postgres
// database the Node services use. It mirrors the three prismaClient calls in
// apps/ws-backend/src/index.ts (create / update-with-version-bump / soft-delete).
//
// IMPLEMENTATION NOTE: the course (Day 5) teaches the pgx + sqlc workflow, and
// db/query.sql + db/sqlc.yaml in this solution show the sqlc inputs. This
// store.go, however, uses pgx DIRECTLY with inline SQL so the reference solution
// COMPILES AND RUNS without you first having to run `sqlc generate`. The SQL is
// identical to what sqlc would execute — so you can study the queries here and
// swap in the generated Queries later if you want. Both are valid; direct pgx is
// just self-contained.
//
// Course reference: Day 5 (all tasks).
package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Store wraps a pgx connection POOL. WHY a pool and not a single connection:
// every connected client runs its own readPump goroutine, and several may write
// a shape at the same instant. A pool hands each concurrent query its own
// connection and recycles them, instead of serializing everything through one
// link or (worse) opening a new connection per query and exhausting Postgres.
type Store struct {
	pool *pgxpool.Pool
}

func New(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

// ShapeInput is the persistence-layer's own view of a shape. It deliberately
// does NOT import the ws.Shape type — keeping the store ignorant of the wire
// format avoids a package import cycle and keeps the layers decoupled. The hub
// translates ws.Shape -> store.ShapeInput.
//
// Points is pre-marshaled JSON bytes (or nil) because the DB column is jsonb.
// Text/FontSize/FontFamily are pointers so nil maps cleanly to SQL NULL.
type ShapeInput struct {
	ID              string
	RoomID          int
	UserID          int
	Type            string
	X               float64
	Y               float64
	Width           float64
	Height          float64
	Angle           float64
	StrokeColor     string
	BackgroundColor string
	StrokeWidth     float64
	StrokeStyle     string
	FillStyle       string
	Opacity         float64
	Points          []byte // marshaled JSON array, or nil for shapes without points
	Text            *string
	FontSize        *float64
	FontFamily      *string
}

// The table and columns are quoted because Prisma created them with capitalized /
// camelCase names ("Shape", "roomId", "strokeColor", ...). In Postgres, unquoted
// identifiers are folded to lowercase, so we MUST quote to match Prisma's casing.
//
// We set "updatedAt" = now() explicitly: Prisma's @updatedAt is applied by the
// Prisma client, not by a database default, so when we write rows directly we
// have to stamp it ourselves. createdAt, version (=1) and isDeleted (=false) all
// have real DB defaults, so we omit them on insert.
const createShapeSQL = `
INSERT INTO "Shape" (
  "id","roomId","userId","type","x","y","width","height","angle",
  "strokeColor","backgroundColor","strokeWidth","strokeStyle","fillStyle","opacity",
  "points","text","fontSize","fontFamily","updatedAt"
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18,$19, now()
)`

// CreateShape mirrors prismaClient.shape.create. The hub calls this BEFORE
// broadcasting; if it returns an error (e.g. a duplicate id), the hub aborts and
// does not broadcast, keeping every client consistent with the database.
func (s *Store) CreateShape(ctx context.Context, in ShapeInput) error {
	_, err := s.pool.Exec(ctx, createShapeSQL,
		in.ID, in.RoomID, in.UserID, in.Type,
		in.X, in.Y, in.Width, in.Height, in.Angle,
		in.StrokeColor, in.BackgroundColor, in.StrokeWidth, in.StrokeStyle, in.FillStyle, in.Opacity,
		jsonbArg(in.Points), in.Text, in.FontSize, in.FontFamily,
	)
	return err
}

// Note we do NOT update id/roomId/userId/type — those are immutable for a shape;
// only geometry/style change. We bump "version" = "version" + 1 on every update.
// version is "last-write-wins plumbing": today nothing reads it, but it's the
// seam where you'd add optimistic-concurrency conflict detection later (e.g.
// WHERE "id"=$1 AND "version"=$expected).
const updateShapeSQL = `
UPDATE "Shape" SET
  "x"=$2,"y"=$3,"width"=$4,"height"=$5,"angle"=$6,
  "strokeColor"=$7,"backgroundColor"=$8,"strokeWidth"=$9,"strokeStyle"=$10,"fillStyle"=$11,"opacity"=$12,
  "points"=$13::jsonb,"text"=$14,"fontSize"=$15,"fontFamily"=$16,
  "version"="version"+1,"updatedAt"=now()
WHERE "id"=$1`

// UpdateShape mirrors prismaClient.shape.update.
func (s *Store) UpdateShape(ctx context.Context, in ShapeInput) error {
	_, err := s.pool.Exec(ctx, updateShapeSQL,
		in.ID,
		in.X, in.Y, in.Width, in.Height, in.Angle,
		in.StrokeColor, in.BackgroundColor, in.StrokeWidth, in.StrokeStyle, in.FillStyle, in.Opacity,
		jsonbArg(in.Points), in.Text, in.FontSize, in.FontFamily,
	)
	return err
}

// SoftDeleteShape mirrors the delete handler: it sets isDeleted=true rather than
// removing the row. WHY soft delete: it avoids update-vs-delete race crashes (the
// row always exists, so a concurrent shape:update never explodes on a missing
// row), and it leaves the door open for undo/restore/audit. GET /shapes filters
// isDeleted=false so deleted shapes never reload.
const softDeleteShapeSQL = `UPDATE "Shape" SET "isDeleted"=true,"updatedAt"=now() WHERE "id"=$1`

func (s *Store) SoftDeleteShape(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, softDeleteShapeSQL, id)
	return err
}

// jsonbArg converts our marshaled points bytes into a value pgx will store into a
// jsonb column. We pass a string (cast to ::jsonb in the SQL) when there are
// points, and nil (=> SQL NULL) otherwise. We avoid passing a raw []byte because
// pgx would encode that as bytea, not jsonb.
func jsonbArg(b []byte) interface{} {
	if len(b) == 0 {
		return nil
	}
	return string(b)
}
