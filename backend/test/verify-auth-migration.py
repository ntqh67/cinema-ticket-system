from pathlib import Path
import subprocess
import os
import uuid
# Chỉ chạy khi người gọi cung cấp database test riêng; không đọc .env của ứng dụng.
test_url = os.environ.get('AUTH_MIGRATION_TEST_URL')
if not test_url:
 raise SystemExit('Set AUTH_MIGRATION_TEST_URL to a disposable PostgreSQL database.')
base=['psql', test_url, '-v','ON_ERROR_STOP=1','-q']
schema = 'auth_test_' + uuid.uuid4().hex
os.chdir(Path(__file__).resolve().parents[2])
def sql(s):
 subprocess.run(base,input=s,text=True,check=True)
sql('CREATE SCHEMA ' + schema + ';')
prefix='SET search_path TO ' + schema + ';\n'
try:
 migrations=sorted(Path('prisma/migrations').glob('*/migration.sql'))
 for p in migrations:
  if '20260908' not in str(p):
   sql(prefix+p.read_text())
 sql(prefix+"""
 INSERT INTO users ("id","email","passwordHash","updatedAt") VALUES ('migration-user','migration@example.com','fixture',now());
 INSERT INTO refresh_tokens ("id","userId","tokenHash","expiresAt","revokedAt","createdAt")
 VALUES ('active','migration-user',repeat('a',64),'2030-01-01',NULL,'2026-01-01'),
        ('revoked','migration-user',repeat('b',64),'2030-01-01','2026-02-01','2026-01-01'),
        ('expired','migration-user',repeat('c',64),'2020-01-01',NULL,'2019-01-01');
 CREATE TABLE session_snapshot AS TABLE refresh_tokens;
 """)
 sql(prefix+Path('prisma/migrations/20260908000000_rename_auth_sessions/migration.sql').read_text())
 sql(prefix+"""
 DO $$
 BEGIN
  IF (SELECT count(*) FROM auth_sessions) <> 3 THEN RAISE EXCEPTION 'Session count changed'; END IF;
  IF EXISTS (
    (SELECT "id","tokenHash","userId","expiresAt","revokedAt","createdAt" FROM auth_sessions
     EXCEPT SELECT * FROM session_snapshot)
    UNION ALL
    (SELECT * FROM session_snapshot EXCEPT
     SELECT "id","tokenHash","userId","expiresAt","revokedAt","createdAt" FROM auth_sessions)
  ) THEN RAISE EXCEPTION 'Session data changed'; END IF;
  IF EXISTS (SELECT 1 FROM auth_sessions WHERE "lastUsedAt" IS NOT NULL) THEN RAISE EXCEPTION 'Unexpected lastUsedAt'; END IF;
  BEGIN
    INSERT INTO auth_sessions ("id","userId","tokenHash","expiresAt") VALUES ('duplicate','migration-user',repeat('a',64),now());
    RAISE EXCEPTION 'Unique constraint missing';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO auth_sessions ("id","userId","tokenHash","expiresAt") VALUES ('orphan','missing',repeat('d',64),now());
    RAISE EXCEPTION 'Foreign key missing';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;
  DELETE FROM users WHERE id='migration-user';
  IF EXISTS (SELECT 1 FROM auth_sessions) THEN RAISE EXCEPTION 'Cascade missing'; END IF;
 END $$;
 DROP TABLE session_snapshot;
 """)
 subprocess.run(['node', 'backend/test/verify-auth-session.cjs', schema], check=True)
 print('PASS: full migration history; rename preserves active/revoked/expired sessions; unique/FK/cascade intact.')
finally:
 sql('SET client_min_messages TO warning; DROP SCHEMA '+schema+' CASCADE;')
