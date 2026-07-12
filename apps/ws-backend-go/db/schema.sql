-- schema.sql — FOR sqlc CODEGEN ONLY. This is NOT a migration.
--
-- Prisma (packages/db/prisma/schema.prisma) is the real owner of the database
-- schema. sqlc, however, needs to SEE the table definitions so it can type-check
-- the queries in query.sql and generate Go structs. This file is a trimmed,
-- hand-written copy of the relevant tables, matching Prisma's exact (quoted,
-- camelCase) column names. If you change the Prisma schema, update this too.
--
-- Course reference: Day 5, Task 5.2.

CREATE TABLE "User" (
  "id"    SERIAL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "password" TEXT NOT NULL,
  "name"  TEXT NOT NULL
);

CREATE TABLE "Room" (
  "id"        SERIAL PRIMARY KEY,
  "slug"      TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT now(),
  "adminId"   INTEGER NOT NULL REFERENCES "User"("id")
);

CREATE TABLE "Shape" (
  "id"              TEXT PRIMARY KEY,
  "roomId"          INTEGER NOT NULL REFERENCES "Room"("id"),
  "userId"          INTEGER NOT NULL REFERENCES "User"("id"),
  "type"            TEXT NOT NULL,
  "x"               DOUBLE PRECISION NOT NULL,
  "y"               DOUBLE PRECISION NOT NULL,
  "width"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "height"          DOUBLE PRECISION NOT NULL DEFAULT 0,
  "angle"           DOUBLE PRECISION NOT NULL DEFAULT 0,
  "strokeColor"     TEXT NOT NULL DEFAULT '#1e1e1e',
  "backgroundColor" TEXT NOT NULL DEFAULT 'transparent',
  "strokeWidth"     DOUBLE PRECISION NOT NULL DEFAULT 1,
  "strokeStyle"     TEXT NOT NULL DEFAULT 'solid',
  "fillStyle"       TEXT NOT NULL DEFAULT 'hachure',
  "opacity"         DOUBLE PRECISION NOT NULL DEFAULT 100,
  "points"          JSONB,
  "text"            TEXT,
  "fontSize"        DOUBLE PRECISION,
  "fontFamily"      TEXT,
  "version"         INTEGER NOT NULL DEFAULT 1,
  "isDeleted"       BOOLEAN NOT NULL DEFAULT false,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMP(3) NOT NULL
);
