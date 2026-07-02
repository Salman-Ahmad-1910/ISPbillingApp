package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"flag"
	"log"
	"math/big"
	"net"
	"os"
	"strings"
	"time"

	"awesomeProject/config"
	_ "awesomeProject/models"
	"awesomeProject/routes"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

// BuildMode is set at build time via -ldflags -X main.BuildMode=prod|dev.
// In production mode the binary serves HTTPS; in development mode it serves HTTP.
var BuildMode string

func ensureTLSCertificates(certFile, keyFile string) {
	if _, err := os.Stat(certFile); err == nil {
		if _, err := os.Stat(keyFile); err == nil {
			return
		}
	}

	log.Printf("Generating self-signed TLS certificates: %s, %s", certFile, keyFile)

	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		log.Fatalf("Failed to generate RSA key: %v", err)
	}

	serial, err := rand.Int(rand.Reader, new(big.Int).Lsh(big.NewInt(1), 128))
	if err != nil {
		log.Fatalf("Failed to generate serial number: %v", err)
	}

	template := x509.Certificate{
		SerialNumber: serial,
		Subject: pkix.Name{
			Organization: []string{"FinTrack-ERP"},
			CommonName:   "localhost",
		},
		NotBefore:             time.Now(),
		NotAfter:              time.Now().Add(365 * 24 * time.Hour),
		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
		IPAddresses:           []net.IP{net.ParseIP("127.0.0.1")},
		DNSNames:              []string{"localhost"},
	}

	certDER, err := x509.CreateCertificate(rand.Reader, &template, &template, &key.PublicKey, key)
	if err != nil {
		log.Fatalf("Failed to create certificate: %v", err)
	}

	if err := os.MkdirAll("./certs", 0755); err != nil {
		log.Fatalf("Failed to create certs directory: %v", err)
	}

	certOut, err := os.Create(certFile)
	if err != nil {
		log.Fatalf("Failed to open %s for writing: %v", certFile, err)
	}
	defer certOut.Close()
	if err := pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: certDER}); err != nil {
		log.Fatalf("Failed to write certificate: %v", err)
	}

	keyOut, err := os.Create(keyFile)
	if err != nil {
		log.Fatalf("Failed to open %s for writing: %v", keyFile, err)
	}
	defer keyOut.Close()
	if err := pem.Encode(keyOut, &pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(key),
	}); err != nil {
		log.Fatalf("Failed to write private key: %v", err)
	}

	log.Printf("Self-signed TLS certificates generated at %s, %s", certFile, keyFile)
}

func main() {
	migrateOnly := flag.Bool("migrate-only", false, "Run database migration only and exit")
	devFlag := flag.Bool("dev", false, "Run in development mode (HTTP)")
	flag.Parse()

	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on environment variables")
	}

	config.ConnectDatabase()
	config.RunMigrations()

	if *migrateOnly {
		log.Println("Migration completed successfully. Exiting...")
		os.Exit(0)
	}

	// Determine mode: build-time ldflags > --dev flag > DEV_MODE env var
	isDev := false
	switch {
	case *devFlag:
		isDev = true
	case strings.ToLower(os.Getenv("DEV_MODE")) == "true":
		isDev = true
	case BuildMode == "prod":
		isDev = false
	default:
		isDev = true // default to dev if nothing is set
	}

	ginMode := os.Getenv("GIN_MODE")
	if !isDev && ginMode == "" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	r.Static("/uploads", "./uploads")
	routes.SetupRoutes(r)

	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status": "ok",
		})
	})

	r.NoRoute(serveFrontend())

	port := os.Getenv("PORT")
	if port == "" {
		port = "8090"
	}

	if isDev {
		log.Printf("Development mode - running on http://localhost:%s", port)
		r.Run(":" + port)
	} else {
		certFile := os.Getenv("TLS_CERT_FILE")
		keyFile := os.Getenv("TLS_KEY_FILE")
		if certFile == "" {
			certFile = "./certs/server.crt"
		}
		if keyFile == "" {
			keyFile = "./certs/server.key"
		}

		ensureTLSCertificates(certFile, keyFile)

		log.Printf("Production mode - running on https://localhost:%s", port)
		r.RunTLS(":"+port, certFile, keyFile)
	}
}
