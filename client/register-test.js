// Test registration to create a user
require('dotenv').config({ path: './.env' });
const axios = require('axios');

async function testRegistration() {
  try {
    console.log('Testing registration...');

    const registerResponse = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/signup`, {
      name: 'Test User',
      companyName: 'Test Company',
      email: 'test@example.com',
      password: 'password123'
    });

    console.log('Registration successful:', registerResponse.data);

    const token = registerResponse.data.data.token;

    // Now test dashboard with token
    const dashboardResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard?companyId=` + registerResponse.data.data.user.companyId, {
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

testRegistration();
