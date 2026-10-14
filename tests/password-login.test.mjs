import assert from 'node:assert/strict';
import { test } from 'node:test';
import { signInWithEmailPassword } from '../src/lib/password-login.ts';

test('signs in with a trimmed email and the supplied password', async () => {
  const calls = [];
  const auth = {
    async signInWithPassword(credentials) {
      calls.push(credentials);
      return { error: null };
    },
  };

  await signInWithEmailPassword(auth, ' teacher@example.com ', 'secret password');
  assert.deepEqual(calls, [{ email: 'teacher@example.com', password: 'secret password' }]);
});

test('does not send blank credentials to Supabase', async () => {
  const auth = { signInWithPassword: () => { throw new Error('unexpected request'); } };
  await assert.rejects(signInWithEmailPassword(auth, '   ', 'password'), /이메일/);
  await assert.rejects(signInWithEmailPassword(auth, 'teacher@example.com', ''), /비밀번호/);
});

test('reports invalid credentials without exposing account status', async () => {
  const auth = {
    async signInWithPassword() {
      return { error: { code: 'invalid_credentials', message: 'Invalid login credentials' } };
    },
  };
  await assert.rejects(signInWithEmailPassword(auth, 'teacher@example.com', 'wrong'), /이메일 또는 비밀번호/);
});
