package auth

import {
	"fmt"
	"errors"
	"github.com/golang-jwt/jwt/v5"
}

var ErrInvalidToken = errors.New("invalid token")

func VerifyToken(tokenString, secret string) (int, error){
	token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error){
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return []byte(secret), nil
	})

	if err != nil || !token.Valid {
		return 0, ErrInvalidToken
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, ErrInvalidToken
	}

	userIDFloat, ok := claims["userId"].(float64)
	if !ok || userIDFloat == 0 {
		return 0, ErrInvalidToken
	}

	return int(userIDFloat), nil
}