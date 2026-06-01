export type LoginRememberScope = 'tenant' | 'admin';

const flagKey = (scope: LoginRememberScope) => `cm_${scope}_remember_login`;
const emailKey = (scope: LoginRememberScope) => `cm_${scope}_remember_email`;

export function loadRememberedLogin(scope: LoginRememberScope): {
  remember: boolean;
  email: string;
} {
  const remember = localStorage.getItem(flagKey(scope)) === 'true';
  const email = remember ? localStorage.getItem(emailKey(scope)) ?? '' : '';
  return { remember, email };
}

export function saveRememberedLogin(
  scope: LoginRememberScope,
  email: string,
  remember: boolean,
): void {
  if (remember && email.trim()) {
    localStorage.setItem(flagKey(scope), 'true');
    localStorage.setItem(emailKey(scope), email.trim());
    return;
  }
  localStorage.removeItem(flagKey(scope));
  localStorage.removeItem(emailKey(scope));
}
