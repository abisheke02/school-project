// E2E Test: Offline Sync
const axios = require('axios');
const API_URL = 'http://localhost:3001/api';

async function runTest() {
  console.log('1. Script started');
  try {
    console.log(`2. Attempting login to ${API_URL}/auth/demo?role=student`);
    const loginRes = await axios.post(`${API_URL}/auth/demo?role=student`);
    console.log('3. Login request finished');
    
    if (!loginRes || !loginRes.data) {
        throw new Error('No data in login response');
    }
    
    const token = loginRes.data.token;
    const student = loginRes.data.user;
    
    console.log(`✅ Logged in as: ${student.name} (${student.id})`);

    const headers = { Authorization: `Bearer ${token}` };

    const syncPayload = {
      sessions: [
        {
          exerciseId: '00000000-0000-0000-0000-000000000099',
          exerciseType: 'phonics',
          answers: [
            { questionId: 'q1', studentAnswer: 'cat', correctAnswer: 'cat', isCorrect: true, responseTimeMs: 1000 }
          ],
          scorePercent: 100,
          timeTakenMs: 1000,
        }
      ]
    };

    console.log('4. Sending sync payload...');
    const syncRes = await axios.post(`${API_URL}/practice/sessions/sync`, syncPayload, { headers });
    console.log('5. Sync result:', syncRes.data);

    console.log('✨ TEST PASSED');
  } catch (err) {
    console.log('❌ CATCH BLOCK REACHED');
    if (err.response) {
      console.error('Data:', err.response.data);
      console.error('Status:', err.response.status);
    } else {
      console.error('Error Object:', err);
      console.error('Message:', err.message);
    }
    process.exit(1);
  }
}

runTest();
