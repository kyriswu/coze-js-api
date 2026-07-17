import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('cleanup removes only exited coze application containers older than retention', () => {
  const tempDir = mkdtempSync(path.join(os.tmpdir(), 'coze-cleanup-test-'));
  const binDir = path.join(tempDir, 'bin');
  const removalsFile = path.join(tempDir, 'removals');
  const lockFile = path.join(tempDir, 'cleanup.lock');
  mkdirSync(binDir);

  const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
  const recent = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
  const dockerStub = `#!/usr/bin/env bash
set -euo pipefail
if [[ "$1" == "ps" ]]; then
  printf 'old-app\\nrecent-blue\\nrunning-green\\nredis\\n'
  exit 0
fi
if [[ "$1" == "inspect" ]]; then
  case "\${!#}" in
    old-app) printf 'exited|${old}|app\\n' ;;
    recent-blue) printf 'exited|${recent}|app-blue\\n' ;;
    running-green) printf 'running|0001-01-01T00:00:00Z|app-green\\n' ;;
    redis) printf 'exited|${old}|my-redis\\n' ;;
  esac
  exit 0
fi
if [[ "$1" == "rm" ]]; then
  printf '%s\\n' "\${!#}" >> "$REMOVALS_FILE"
  exit 0
fi
printf 'unexpected docker invocation: %s\\n' "$*" >&2
exit 1
`;
  const dockerPath = path.join(binDir, 'docker');
  writeFileSync(dockerPath, dockerStub, { mode: 0o755 });

  const result = spawnSync('bash', ['scripts/cleanup-stopped-app-containers.sh'], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${binDir}:${process.env.PATH}`,
      LOCK_FILE: lockFile,
      REMOVALS_FILE: removalsFile,
      RETENTION_SECONDS: '86400',
    },
  });

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readFileSync(removalsFile, 'utf8').trim().split('\n'), ['old-app']);
  assert.match(result.stdout, /Removed 1 expired stopped container/);
});
