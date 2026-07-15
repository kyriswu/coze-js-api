import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { deployStaticZip } from '../utils/staticZipDeployment.js';

const sha256 = (content) => crypto.createHash('sha256').update(content).digest('hex');

async function createValidArtifact(downloadsDir, fileName = 'release.zip', legacyTemplate = false) {
    const sourceDir = await fs.mkdtemp(path.join(os.tmpdir(), 'static-artifact-'));
    const siteDir = path.join(sourceDir, 'site');
    await fs.mkdir(siteDir, { recursive: true });

    const html = '<!doctype html><title>verified release</title>';
    await fs.writeFile(path.join(siteDir, 'index.html'), html);
    await fs.writeFile(path.join(sourceDir, 'artifact-manifest.json'), JSON.stringify({
        version: 1,
        files: [{
            path: 'site/index.html',
            [legacyTemplate ? 'bytes' : 'size']: Buffer.byteLength(html),
            sha256: sha256(html),
        }],
    }));
    await fs.writeFile(path.join(sourceDir, 'deployment-dossier.json'), JSON.stringify({
        source: { type: 'local-static-artifact' },
        ...(legacyTemplate ? { topology: { safeToSubmit: true } } : { safeToSubmit: true }),
    }));

    const zipPath = path.join(downloadsDir, fileName);
    execFileSync('python3', ['-c', [
        'import os, sys, zipfile',
        'src, out = sys.argv[1], sys.argv[2]',
        'with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:',
        '  for root, _, files in os.walk(src):',
        '    for name in files:',
        '      p = os.path.join(root, name)',
        '      z.write(p, os.path.relpath(p, src))',
    ].join('\n'), sourceDir, zipPath]);
    return zipPath;
}

test('deploys a verified local static artifact into an immutable public release URL', async (t) => {
    const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'static-deploy-test-'));
    const downloadsDir = path.join(sandbox, 'downloads');
    await fs.mkdir(downloadsDir);
    await createValidArtifact(downloadsDir);
    t.after(() => fs.rm(sandbox, { recursive: true, force: true }));

    const result = await deployStaticZip({
        content: 'https://coze-js-api.devtool.uk/downloads/release.zip',
        downloadsDir,
        publicBaseUrl: 'https://static.devtool.uk/static-releases',
        verifyPublicUrl: async (url) => ({ status: 200, contentType: 'text/html; charset=utf-8', body: `verified ${url}` }),
    });

    assert.equal(result.status, 'deployed');
    assert.match(result.releaseId, /^release-/);
    assert.equal(result.url, `https://static.devtool.uk/static-releases/${result.releaseId}/`);
    assert.equal(result.httpVerification.status, 200);
    await fs.access(path.join(downloadsDir, 'static-releases', result.releaseId, 'index.html'));
});

test('accepts the previously published manifest and dossier template fields during the migration', async (t) => {
    const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'static-deploy-test-'));
    const downloadsDir = path.join(sandbox, 'downloads');
    await fs.mkdir(downloadsDir);
    await createValidArtifact(downloadsDir, 'legacy-template.zip', true);
    t.after(() => fs.rm(sandbox, { recursive: true, force: true }));

    const result = await deployStaticZip({
        content: 'https://coze-js-api.devtool.uk/downloads/legacy-template.zip',
        downloadsDir,
        publicBaseUrl: 'https://static.devtool.uk/static-releases',
        verifyPublicUrl: async () => ({ status: 200, contentType: 'text/html', body: 'ok' }),
    });

    assert.equal(result.status, 'deployed');
});

test('rejects an artifact URL outside the private upload allowlist without creating a release', async (t) => {
    const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'static-deploy-test-'));
    const downloadsDir = path.join(sandbox, 'downloads');
    await fs.mkdir(downloadsDir);
    t.after(() => fs.rm(sandbox, { recursive: true, force: true }));

    const result = await deployStaticZip({
        content: 'https://example.com/release.zip',
        downloadsDir,
        publicBaseUrl: 'https://static.devtool.uk/static-releases',
    });

    assert.deepEqual(result, {
        status: 'rejected',
        reason: 'UNTRUSTED_ARTIFACT_URL',
        checks: ['ZIP URL 必须是受信服务的无查询 HTTPS 地址'],
    });
    await assert.rejects(fs.access(path.join(downloadsDir, 'static-releases')));
});

test('rejects a ZIP whose manifest hash does not match its static file and leaves no release', async (t) => {
    const sandbox = await fs.mkdtemp(path.join(os.tmpdir(), 'static-deploy-test-'));
    const downloadsDir = path.join(sandbox, 'downloads');
    await fs.mkdir(downloadsDir);
    await createValidArtifact(downloadsDir, 'bad-manifest.zip');
    const zipPath = path.join(downloadsDir, 'bad-manifest.zip');
    const corruptDir = await fs.mkdtemp(path.join(os.tmpdir(), 'static-corrupt-'));
    execFileSync('unzip', ['-qq', zipPath, '-d', corruptDir]);
    const manifestPath = path.join(corruptDir, 'artifact-manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    manifest.files[0].sha256 = '0'.repeat(64);
    await fs.writeFile(manifestPath, JSON.stringify(manifest));
    await fs.rm(zipPath);
    execFileSync('python3', ['-c', [
        'import os, sys, zipfile',
        'src, out = sys.argv[1], sys.argv[2]',
        'with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:',
        '  for root, _, files in os.walk(src):',
        '    for name in files:',
        '      p = os.path.join(root, name)',
        '      z.write(p, os.path.relpath(p, src))',
    ].join('\n'), corruptDir, zipPath]);
    t.after(() => Promise.all([
        fs.rm(sandbox, { recursive: true, force: true }),
        fs.rm(corruptDir, { recursive: true, force: true }),
    ]));

    const result = await deployStaticZip({
        content: 'https://coze-js-api.devtool.uk/downloads/bad-manifest.zip',
        downloadsDir,
        publicBaseUrl: 'https://static.devtool.uk/static-releases',
    });

    assert.equal(result.status, 'rejected');
    assert.equal(result.reason, 'STATIC_VALIDATION_FAILED');
    assert.match(result.checks[0], /manifest 校验失败/);
    const releaseEntries = await fs.readdir(path.join(downloadsDir, 'static-releases'));
    assert.deepEqual(releaseEntries.filter((entry) => entry.startsWith('release-')), []);
});
