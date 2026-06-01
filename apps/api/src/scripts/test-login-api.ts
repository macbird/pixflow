import { AuthService } from '../modules/auth/auth.service';
import { AdminAuthService } from '../modules/admin/admin-auth.service';

async function main() {
  const auth = new AuthService();
  const adminAuth = new AdminAuthService();

  try {
    const user = await auth.login('test_final@example.com', 'SenhaFinal123!');
    console.log('TENANT API login OK:', user.email, user.account.name);
  } catch (e) {
    console.log('TENANT API login FAIL:', (e as Error).message);
  }

  try {
    const admin = await adminAuth.login('admin@iptvmanager.com', 'admin123');
    console.log('ADMIN API login OK:', admin.email);
  } catch (e) {
    console.log('ADMIN API login FAIL:', (e as Error).message);
  }
}

main();
