import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isPermanentUser } from '../src/lib/auth-identity.ts';

test('accepts an existing email account regardless of its allow-list status', () => {
  assert.equal(isPermanentUser({ email: 'teacher@example.com', is_anonymous: false }), true);
});

test('rejects anonymous and email-less identities', () => {
  assert.equal(isPermanentUser({ email: '', is_anonymous: false }), false);
  assert.equal(isPermanentUser({ email: undefined, is_anonymous: false }), false);
  assert.equal(isPermanentUser({ email: 'teacher@example.com', is_anonymous: true }), false);
  assert.equal(isPermanentUser(null), false);
});
