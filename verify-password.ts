import argon2 from 'argon2';

async function verify() {
  const hash = '$argon2id$v=19$m=65536,t=3,p=4$eGzCKgTjxKp+TSL7g3QGQA$9Nd6Mc7B6xI5JfWVv3NE077eFUBdJx42laKZRBnf3ms';
  const password = 'Password123!';
  
  const isValid = await argon2.verify(hash, password);
  console.log('Password verification result:', isValid);
}

verify();
