// Debug script to test dashboard API
require('dotenv').config({ path: './.env' });
const axios = require('axios');

async function testDashboard() {
  try {
    console.log('Testing dashboard API...');

    // First, try to login
    const loginResponse = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`, {
      email: 'hutezefu@mailinator.com',
      password: 'password123'
    });

    console.log('Login successful:', loginResponse.data);

    const token = loginResponse.data.data.token;

    // Now test dashboard with token
    const dashboardResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard?companyId=5b771a77-70dc-4d7b-a3e3-1161b018a7ab`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Dashboard data:', dashboardResponse.data);

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testDashboard();
