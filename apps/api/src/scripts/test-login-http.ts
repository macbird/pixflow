async function post(url: string, body: object) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log(res.status, url);
  console.log(text.slice(0, 200));
}

async function main() {
  const base = process.env.API_BASE ?? 'http://localhost:3001';
  await post(`${base}/api/auth/login`, {
    email: 'test_final@example.com',
    password: 'SenhaFinal123!',
  });
  await post(`${base}/api/admin/auth/login`, {
    email: 'admin@iptvmanager.com',
    password: 'admin123',
  });
}

main();
