# FinTrack-ERP Deployment Guide

## 🚀 Quick Deployment

### Prerequisites
- Go 1.19+ installed
- PostgreSQL database
- Server with internet access

### Environment Variables
Set these environment variables before running:

```bash
export DB_HOST=localhost
export DB_USER=postgres
export DB_PASSWORD=yourpassword
export DB_NAME=fintrack_erp
export DB_PORT=5432
```

### Option 1: Using Deployment Script (Recommended)

1. **Upload files to server:**
   ```bash
   scp -r FinTrack-ERP/ user@server:/path/to/
   ```

2. **SSH into server:**
   ```bash
   ssh user@server
   cd /path/to/FinTrack-ERP
   ```

3. **Run deployment script:**
   ```bash
   ./deploy.sh
   ```

### Option 2: Manual Deployment

1. **Download dependencies:**
   ```bash
   go mod download
   go mod tidy
   ```

2. **Build application:**
   ```bash
   go build -o fintrack-erp main.go
   ```

3. **Run migration only (first time):**
   ```bash
   ./fintrack-erp --migrate-only
   ```

4. **Start server:**
   ```bash
   ./fintrack-erp
   ```

## 🗄️ Database Migration

The application automatically handles database migration:

### What Gets Created:
- **Custom Enum Types:**
  - `unit_type_enum` ('piece', 'meter', 'kilogram', 'liter')
  - `status_enum` ('active', 'inactive', 'pending', 'completed', 'cancelled')
  - `gender_enum` ('male', 'female', 'other')

- **Database Tables:** All models are migrated automatically

### Migration Process:
1. Creates custom enum types first
2. Verifies enum types exist
3. Runs GORM auto-migration for all models
4. Logs success/failure for each step

## 🔧 Troubleshooting

### Common Issues:

#### 1. "type unit_type_enum does not exist"
**Solution:** The enum creation failed. Check:
- Database permissions
- PostgreSQL version compatibility
- Run with `--migrate-only` flag first

#### 2. Permission Denied
**Solution:** Ensure database user has CREATE TYPE permission:
```sql
GRANT CREATE ON DATABASE your_db TO your_user;
```

#### 3. Connection Failed
**Solution:** Check environment variables:
```bash
echo $DB_HOST $DB_USER $DB_NAME $DB_PORT
```

### Migration Logs:
The migration process logs detailed information:
```
Creating custom enum types...
unit_type_enum created successfully
status_enum created successfully
gender_enum created successfully
Verifying enum types...
✓ unit_type_enum exists
✓ status_enum exists
✓ gender_enum exists
Running AutoMigration...
Migration completed successfully
```

## 🌐 Accessing the Application

Once deployed successfully:
- **API Base URL:** `http://your-server:8090`
- **Health Check:** `http://your-server:8090/health`
- **Frontend:** Configure your web server to serve the client build

## 📝 Production Considerations

1. **Environment Variables:** Use `.env` file for production
2. **Database Security:** Use strong passwords and limit access
3. **SSL/TLS:** Configure HTTPS for production
4. **Process Manager:** Use systemd or PM2 to keep server running
5. **Backups:** Regular database backups

### Systemd Service Example:
```ini
[Unit]
Description=FinTrack-ERP
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/FinTrack-ERP
ExecStart=/path/to/FinTrack-ERP/fintrack-erp
Restart=always
RestartSec=10
Environment=DB_HOST=localhost
Environment=DB_USER=fintrack
Environment=DB_PASSWORD=yourpassword
Environment=DB_NAME=fintrack_erp
Environment=DB_PORT=5432

[Install]
WantedBy=multi-user.target
```

## 🆘 Support

If you encounter issues:
1. Check migration logs carefully
2. Verify database permissions
3. Ensure all environment variables are set
4. Check PostgreSQL version compatibility

The migration system is designed to be robust and should handle most deployment scenarios automatically.
