-- Update specific user role to admin in both tables
-- User ID: fec90801-109f-41fa-a78b-fb5d313ff01e

-- Update users table
UPDATE users 
SET role = 'admin' 
WHERE id = 'fec90801-109f-41fa-a78b-fb5d313ff01e';

-- Update user_companies table (should already be admin, but ensuring)
UPDATE user_companies 
SET role_in_company = 'admin' 
WHERE user_id = 'fec90801-109f-41fa-a78b-fb5d313ff01e';

-- Verify the changes
SELECT 'users table role: ' || role || "'" as user_role FROM users WHERE id = 'fec90801-109f-41fa-a78b-fb5d313ff01e';

SELECT 'user_companies table role: ' || role_in_company || "'" as company_role FROM user_companies WHERE user_id = 'fec90801-109f-41fa-a78b-fb5d313ff01e';
