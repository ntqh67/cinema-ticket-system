const assert = require('node:assert/strict');
const { PrismaClient } = require('../../node_modules/@prisma/client');
const { AuthService } = require('../dist/auth/auth.service');
const { createHash } = require('node:crypto');
// Script migration gọi test này với schema riêng; không dùng database ứng dụng.
if (
  !process.env.AUTH_MIGRATION_TEST_URL ||
  !/^auth_test_[a-f0-9]{32}$/.test(process.argv[2] || '')
) {
  throw new Error(
    'Run through verify-auth-migration.py with a disposable test database.',
  );
}
const url = new URL(process.env.AUTH_MIGRATION_TEST_URL);
url.searchParams.set('schema', process.argv[2]);
const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
(async () => {
  const auth = new AuthService(db);
  const dto = {
    name: 'Integration User',
    email: 'integration-auth@example.com',
    password: 'secret123',
  };
  const registered = await auth.register(dto);
  const stored = await db.authSession.findUnique({
    where: {
      tokenHash: createHash('sha256')
        .update(registered.accessToken)
        .digest('hex'),
    },
  });
  assert(stored);
  assert.notEqual(stored.tokenHash, registered.accessToken);
  assert.equal(
    (await auth.authenticate(registered.accessToken)).user.id,
    registered.user.id,
  );
  const second = await auth.login({
    identifier: dto.email,
    password: dto.password,
  });
  await auth.logout(stored.id);
  await assert.rejects(
    auth.authenticate(registered.accessToken),
    (e) => e.getStatus() === 401,
  );
  await auth.authenticate(second.accessToken);
  await db.user.update({
    where: { id: registered.user.id },
    data: { isActive: false },
  });
  await assert.rejects(
    auth.authenticate(second.accessToken),
    (e) => e.getStatus() === 401,
  );
  await assert.rejects(
    auth.login({ identifier: dto.email, password: dto.password }),
    (e) => e.getStatus() === 401,
  );
  await db.user.delete({ where: { id: registered.user.id } });
  assert.equal(
    await db.authSession.count({ where: { userId: registered.user.id } }),
    0,
  );
  const race = await Promise.allSettled([
    auth.register({ ...dto, email: 'race@example.com' }),
    auth.register({ ...dto, email: 'race@example.com' }),
  ]);
  assert.equal(race.filter((r) => r.status === 'fulfilled').length, 1);
  assert.equal(
    race.find((r) => r.status === 'rejected').reason.getStatus(),
    409,
  );
  const raceUser = await db.user.findUnique({
    where: { email: 'race@example.com' },
  });
  assert.equal(
    await db.authSession.count({ where: { userId: raceUser.id } }),
    1,
  );
  await db.user.delete({ where: { id: raceUser.id } });
  console.log(
    'PASS: real PostgreSQL register/login/hash lookup/logout/multiple devices/inactive user/cascade.',
  );
})()
  .finally(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
