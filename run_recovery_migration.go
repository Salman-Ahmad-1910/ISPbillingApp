package main

import (
	"awesomeProject/config"
	"awesomeProject/migrations"
	"log"
)

func main() {
	// Initialize database connection
	config.ConnectDatabase()

	// Run migrations including the new RecoveryOfficer model
	migrations.RunMigrations()

	log.Println("Recovery Officer table created successfully!")
}
