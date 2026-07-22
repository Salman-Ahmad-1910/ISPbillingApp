package utils

import (
	"errors"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

type JWTClaims struct {
	UserID        uuid.UUID `json:"user_id"`
	CompanyID     uuid.UUID `json:"company_id"`
	RoleInCompany string    `json:"role_in_company"`
	jwt.RegisteredClaims
}

func GenerateToken(userID, companyID uuid.UUID, roleInCompany string) (string, error) {
	secret := os.Getenv("SECRET")
	if secret == "" {
		return "", errors.New("jwt secret not configured")
	}

	claims := JWTClaims{
		UserID:        userID,
		CompanyID:     companyID,
		RoleInCompany: roleInCompany,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

func ValidateToken(tokenString string) (*JWTClaims, error) {
	secret := os.Getenv("SECRET")

	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		return []byte(secret), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("invalid token")
}
