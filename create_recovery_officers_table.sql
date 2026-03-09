-- Create recovery_officers table
CREATE TABLE IF NOT EXISTS recovery_officers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    secondary_phone VARCHAR(20),
    area_id UUID REFERENCES areas(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'active',
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_recovery_officers_company_id ON recovery_officers(company_id);
CREATE INDEX IF NOT EXISTS idx_recovery_officers_area_id ON recovery_officers(area_id);
CREATE INDEX IF NOT EXISTS idx_recovery_officers_email ON recovery_officers(email);

-- Add comments for documentation
COMMENT ON TABLE recovery_officers IS 'Table for storing recovery officer information separate from staff';
COMMENT ON COLUMN recovery_officers.secondary_phone IS 'Secondary contact number for recovery officers';
COMMENT ON COLUMN recovery_officers.status IS 'Current status of recovery officer (active/inactive)';
