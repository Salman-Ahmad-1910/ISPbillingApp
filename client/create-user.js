// Create a new user with known credentials
require('dotenv').config({ path: './.env' });
const axios = require('axios');

async function createUser() {
  try {
    console.log('Creating new user...');

    const registerResponse = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/signup`, {
      name: 'Admin User',
      companyName: 'Admin Company',
      email: 'admin@test.com',
      password: 'admin123'
    });

    console.log('User created successfully:', registerResponse.data);

    const token = registerResponse.data.data.token;
    const companyId = registerResponse.data.data.user.companyId;

    // Now test dashboard with token
    const dashboardResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard?companyId=${companyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Dashboard data:', dashboardResponse.data);

    console.log('\n=== LOGIN CREDENTIALS ===');
    console.log('Email: admin@test.com');
    console.log('Password: admin123');
    console.log('========================');

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

createUser();
