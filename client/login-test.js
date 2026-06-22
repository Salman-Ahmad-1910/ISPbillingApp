// Test login with different passwords
require('dotenv').config({ path: './.env' });
const axios = require('axios');

const passwords = ['password', '123456', 'admin', 'test', 'password123'];

async function testLogin() {
  for (const password of passwords) {
    try {
      console.log(`Trying password: ${password}`);

      const loginResponse = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL}/auth/login`, {
        email: 'hutezefu@mailinator.com',
        password: password
      });

      console.log('Login successful with password:', password);
      console.log('Response:', loginResponse.data);

      const token = loginResponse.data.data.token;

      // Now test dashboard with token
      const dashboardResponse = await axios.get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/dashboard?companyId=5b771a77-70dc-4d7b-a3e3-1161b018a7ab`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Dashboard data:', dashboardResponse.data);
      return;

    } catch (error) {
      console.log(`Failed with password ${password}:`, error.response?.data?.message || error.message);
    }
  }
}

testLogin();
