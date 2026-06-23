package config

import "os"

type Config struct{
	Port  string
	JWTSecret string
	DatabaseURL string
}

func Load() Config{
	return Config{
		Port: getenv("PORT", "8081"),
		JWTSecret: getenv("JWT_SECRET", "secret"),
		DatabaseURL: os.Getenv("DATABASE_URL"),
	}
}

func getenv(key string, fallback string) string{
	v, ok := os.LookupEnv(key)
	if(ok && v != ""){
		return v
	}
	return fallback
}