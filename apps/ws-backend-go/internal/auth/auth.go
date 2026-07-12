// Package auth verifies the JWT that the client presents on the WebSocket
// handshake. This is the Go equivalent of `checkUser()` in
// apps/ws-backend/src/index.ts.
//
// Course reference: Day 2, Tasks 2.2–2.3.
package auth

import (
	"errors"
	"fmt"

	"github.com/golang-jwt/jwt/v5"
)

// ErrInvalidToken is returned for every failure mode (bad signature, wrong
// algorithm, missing/zero userId, expired, malformed). We deliberately collapse
// them into ONE opaque error so a caller can't tell *why* a token failed — the
// same "don't leak information to attackers" instinct behind the HTTP backend
// returning a generic "Unauthorized".
var ErrInvalidToken = errors.New("invalid token")

// VerifyToken parses and cryptographically verifies an HS256 JWT that was signed
// by the Node http-backend via `jwt.sign({ userId }, JWT_SECRET)`, and returns
// the embedded userId.
//
// WHY this matters: this Go process never saw the user log in. It can only trust
// the client because it INDEPENDENTLY re-verifies the signature with the shared
// secret. That is the entire point of stateless JWT auth across a multi-process,
// multi-language backend — no shared session store required.
func VerifyToken(tokenString, secret string) (int, error) {
	// jwt.Parse takes a "keyfunc" callback. It's a callback (not just the key)
	// because the library first reads the token header to learn which algorithm
	// the token CLAIMS to use, and only then asks us for the verification key.
	// This is the hook where we defend against the classic "alg confusion" attack.
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
		// SECURITY: pin the algorithm. Without this check, an attacker could send
		// a token with alg=none or alg=RS256 and trick a naive verifier into
		// accepting it. We only accept HMAC (HS256), which is what Node signs with.
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		// The key for HMAC verification is the raw secret bytes.
		return []byte(secret), nil
	})
	if err != nil || !token.Valid {
		return 0, ErrInvalidToken
	}

	// Claims is an untyped map (jwt.MapClaims) because JWT payloads are arbitrary
	// JSON. We type-assert our way to the userId.
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, ErrInvalidToken
	}

	// GOTCHA worth knowing for interviews: JSON numbers decode to float64 in Go's
	// encoding/json (and therefore in jwt.MapClaims). The userId we put in as an
	// integer comes back as a float64, so we assert float64 then convert to int.
	userIDFloat, ok := claims["userId"].(float64)
	if !ok || userIDFloat == 0 {
		return 0, ErrInvalidToken
	}

	return int(userIDFloat), nil
}
