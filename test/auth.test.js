const test = require('node:test');
const assert = require('node:assert/strict');

process.env.AUTH_TOKEN_SECRET = 'test-secret-that-is-long-enough-to-sign-tokens-safely';

const { createSessionToken, hashPassword, verifyPassword, verifyToken } = require('../api/auth');
const app = require('../api');
const { REPORT_STATUSES } = app;

test('password hashes verify only the original password', () => {
  const passwordHash = hashPassword('correct horse battery staple');
  assert.equal(verifyPassword('correct horse battery staple', passwordHash), true);
  assert.equal(verifyPassword('not the password', passwordHash), false);
});

test('session tokens are signed and reject tampering', () => {
  const token = createSessionToken('507f1f77bcf86cd799439011');
  assert.equal(verifyToken(token).sub, '507f1f77bcf86cd799439011');
  assert.equal(verifyToken(`${token}x`), null);
});

test('report statuses use the restricted administrative set', () => {
  assert.deepEqual(REPORT_STATUSES, ['Pending', 'Under Review', 'In Progress', 'Resolved', 'Rejected']);
  assert.equal(REPORT_STATUSES.includes('random'), false);
});

test('unauthenticated status updates are rejected before database access', async () => {
  const response = {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
  await app.requireAdmin({ get: () => undefined }, response, () => assert.fail('next must not run'));
  assert.equal(response.statusCode, 401);
  assert.deepEqual(response.body, { error: 'Unauthorized' });
});
