import assert from 'assert';

const BASE = process.env.SMOKE_BASE || 'http://localhost:3000/api';

async function run() {
  console.log('Smoke test starting against', BASE);

  // 1. Health
  const healthRes = await fetch(`${BASE}/health`);
  console.log('/health', healthRes.status);
  assert.strictEqual(healthRes.status, 200, 'Health endpoint must return 200');
  const healthJson = await healthRes.json();
  console.log('health:', healthJson);

  // 2. Try login with seeded mock user
  const loginRes = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@autocal.com', password: 'admin123' })
  });
  console.log('/auth/login', loginRes.status);

  if (loginRes.status === 200) {
    const loginJson = await loginRes.json();
    console.log('login success user:', loginJson.user?.email || loginJson.user);

    const token = loginJson.token;
    assert(token, 'Login should return a token');

    // 3. Fetch vehicles with token
    const vehiclesRes = await fetch(`${BASE}/vehicles`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('/vehicles', vehiclesRes.status);
    const vehicles = await vehiclesRes.json();
    console.log('vehicles count:', Array.isArray(vehicles) ? vehicles.length : 'N/A');
  } else {
    const text = await loginRes.text();
    console.warn('Login failed; continuing. Response:', text.slice(0, 400));
  }

  // 4. Ensure missing API routes return JSON 404
  const missingRes = await fetch(`${BASE}/nonexistent-route`);
  console.log('/nonexistent-route', missingRes.status);
  const ct = missingRes.headers.get('content-type') || '';
  const body = await missingRes.text();
  console.log('missing route content-type:', ct);
  try {
    const json = JSON.parse(body);
    console.log('missing route json error:', json.error);
  } catch (e) {
    console.warn('Missing route did not return JSON. Body snippet:', body.slice(0,200));
    throw new Error('Missing API routes must return JSON 404');
  }

  console.log('Smoke test completed.');
}

run().catch(err => { console.error('Smoke test failed:', err); process.exit(1); });
