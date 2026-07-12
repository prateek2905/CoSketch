-- query.sql — sqlc query definitions. Running `sqlc generate` (configured by
-- sqlc.yaml) turns each annotated query into a type-safe Go method.
--
-- These three queries are the EXACT operations the realtime layer needs, and they
-- mirror the three prismaClient.shape.* calls in apps/ws-backend/src/index.ts.
--
-- The reference store.go runs equivalent SQL directly with pgx so the solution
-- compiles without codegen; this file shows the sqlc path the course teaches. The
-- `:exec` annotation means "no rows returned, just run it".
--
-- Course reference: Day 5, Tasks 5.2–5.3.

-- name: CreateShape :exec
-- Insert a brand-new shape. id is the client-generated UUID; userId comes from
-- the verified token (passed in by the caller), never from the client payload.
-- updatedAt is set explicitly because @updatedAt is a Prisma-client behavior, not
-- a DB default.
INSERT INTO "Shape" (
  "id","roomId","userId","type","x","y","width","height","angle",
  "strokeColor","backgroundColor","strokeWidth","strokeStyle","fillStyle","opacity",
  "points","text","fontSize","fontFamily","updatedAt"
) VALUES (
  $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, now()
);

-- name: UpdateShape :exec
-- Update geometry/style only (id/roomId/userId/type are immutable) and bump the
-- version. version is optimistic-concurrency plumbing for future conflict
-- detection; today it's incremented but not read.
UPDATE "Shape" SET
  "x"=$2,"y"=$3,"width"=$4,"height"=$5,"angle"=$6,
  "strokeColor"=$7,"backgroundColor"=$8,"strokeWidth"=$9,"strokeStyle"=$10,"fillStyle"=$11,"opacity"=$12,
  "points"=$13,"text"=$14,"fontSize"=$15,"fontFamily"=$16,
  "version"="version"+1,"updatedAt"=now()
WHERE "id"=$1;

-- name: SoftDeleteShape :exec
-- Soft delete: flag the row instead of removing it. Avoids update-vs-delete race
-- crashes and preserves history.
UPDATE "Shape" SET "isDeleted"=true,"updatedAt"=now() WHERE "id"=$1;
