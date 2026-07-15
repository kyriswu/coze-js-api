import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile as execFileCallback } from 'node:child_process';

const execFile = promisify(execFileCallback);

const MAX_ZIP_BYTES = 20 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 2_000;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 100;
const TRUSTED_UPLOAD_HOSTS = new Set(['coze-js-api.devtool.uk', 'static.devtool.uk']);
const ALLOWED_STATIC_EXTENSIONS = new Set([
    '.html', '.css', '.js', '.mjs', '.json', '.svg', '.png', '.jpg', '.jpeg', '.webp',
    '.gif', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.mp3', '.mp4', '.webm', '.wasm',
]);

class DeploymentRejected extends Error {
    constructor(reason, checks = []) {
        super(reason);
        this.reason = reason;
        this.checks = checks;
    }
}

const reject = (reason, ...checks) => {
    throw new DeploymentRejected(reason, checks.flat().filter(Boolean));
};

const sha256File = async (filePath) => {
    const data = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(data).digest('hex');
};

const assertWithin = (candidate, root, reason) => {
    const normalizedRoot = path.resolve(root);
    const normalizedCandidate = path.resolve(candidate);
    if (normalizedCandidate !== normalizedRoot && !normalizedCandidate.startsWith(`${normalizedRoot}${path.sep}`)) {
        reject(reason);
    }
    return normalizedCandidate;
};

const resolveTrustedZipPath = async ({ content, downloadsDir }) => {
    if (typeof content !== 'string' || !content.trim()) {
        reject('INVALID_REQUEST', 'content 必须是已上传 ZIP 的 HTTPS URL');
    }

    let url;
    try {
        url = new URL(content);
    } catch {
        reject('UNTRUSTED_ARTIFACT_URL', 'content 不是有效 HTTPS URL');
    }

    if (url.protocol !== 'https:' || !TRUSTED_UPLOAD_HOSTS.has(url.hostname) || url.username || url.password || url.search || url.hash) {
        reject('UNTRUSTED_ARTIFACT_URL', 'ZIP URL 必须是受信服务的无查询 HTTPS 地址');
    }

    const cozePrefix = '/downloads/';
    const staticPrefix = '/';
    const rawRelative = url.hostname === 'coze-js-api.devtool.uk'
        ? (url.pathname.startsWith(cozePrefix) ? url.pathname.slice(cozePrefix.length) : null)
        : (url.pathname.startsWith(staticPrefix) ? url.pathname.slice(staticPrefix.length) : null);

    if (!rawRelative) {
        reject('UNTRUSTED_ARTIFACT_URL', 'ZIP URL 不在受信上传公开路径中');
    }

    let relativePath;
    try {
        relativePath = decodeURIComponent(rawRelative);
    } catch {
        reject('UNTRUSTED_ARTIFACT_URL', 'ZIP URL 包含无效路径编码');
    }

    if (!/^(?:persistent\/)?[A-Za-z0-9._-]{1,160}\.zip$/i.test(relativePath)) {
        reject('UNTRUSTED_ARTIFACT_URL', 'ZIP URL 必须引用受控上传目录中的单个 .zip 文件');
    }

    const zipPath = assertWithin(path.join(downloadsDir, relativePath), downloadsDir, 'UNTRUSTED_ARTIFACT_URL');
    let stat;
    try {
        stat = await fs.lstat(zipPath);
    } catch {
        reject('ARTIFACT_NOT_FOUND', '已上传 ZIP 在部署服务本地存储中不存在');
    }
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size < 1 || stat.size > MAX_ZIP_BYTES) {
        reject('ARCHIVE_LIMIT_EXCEEDED', 'ZIP 不是受支持的普通文件或超过大小上限');
    }
    return { zipPath, zipSha256: await sha256File(zipPath) };
};

const runArchiveCommand = async (command, args) => {
    try {
        return await execFile(command, args, { maxBuffer: 5 * 1024 * 1024 });
    } catch (error) {
        reject('STATIC_VALIDATION_FAILED', `无法安全检查 ZIP：${error.stderr || error.message}`);
    }
};

const getArchiveEntries = async (zipPath) => {
    const { stdout } = await runArchiveCommand('unzip', ['-Z', '-1', zipPath]);
    const entries = String(stdout).split(/\r?\n/).filter(Boolean);
    if (entries.length === 0 || entries.length > MAX_ARCHIVE_ENTRIES) {
        reject('ARCHIVE_LIMIT_EXCEEDED', 'ZIP 条目数量不在允许范围内');
    }

    const seen = new Set();
    for (const entry of entries) {
        if (entry.length > 512 || entry.includes('\\') || entry.includes('\0') || entry.startsWith('/') || entry.split('/').includes('..')) {
            reject('STATIC_VALIDATION_FAILED', `ZIP 含非法路径：${entry}`);
        }
        if (seen.has(entry)) {
            reject('STATIC_VALIDATION_FAILED', `ZIP 含重复路径：${entry}`);
        }
        seen.add(entry);
        const topLevel = entry.split('/')[0];
        if (!['artifact-manifest.json', 'deployment-dossier.json', 'site'].includes(topLevel)) {
            reject('STATIC_VALIDATION_FAILED', `ZIP 顶层存在不允许的条目：${entry}`);
        }
        if (!entry.endsWith('/') && !['artifact-manifest.json', 'deployment-dossier.json'].includes(entry) && !entry.startsWith('site/')) {
            reject('STATIC_VALIDATION_FAILED', `ZIP 文件布局不符合静态发布契约：${entry}`);
        }
        if (entry.startsWith('site/') && !entry.endsWith('/')) {
            const extension = path.posix.extname(entry).toLowerCase();
            if (!ALLOWED_STATIC_EXTENSIONS.has(extension)) {
                reject('STATIC_VALIDATION_FAILED', `site 中含不允许的文件类型：${entry}`);
            }
        }
    }

    for (const required of ['artifact-manifest.json', 'deployment-dossier.json', 'site/index.html']) {
        if (!seen.has(required)) {
            reject('STATIC_VALIDATION_FAILED', `ZIP 缺少必需条目：${required}`);
        }
    }
    return entries;
};

const validateZipMetadata = async (zipPath, entries) => {
    const { stdout } = await runArchiveCommand('unzip', ['-l', zipPath]);
    let totalUncompressed = 0;
    const listedEntries = new Set();
    for (const line of String(stdout).split(/\r?\n/)) {
        const match = line.match(/^\s*(\d+)\s+(?:\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4})\s+\d{2}:\d{2}\s+(.+)$/);
        if (!match) continue;
        const size = Number(match[1]);
        const entry = match[2];
        if (entries.includes(entry)) {
            totalUncompressed += size;
            listedEntries.add(entry);
        }
    }
    if (listedEntries.size !== entries.length || totalUncompressed > MAX_TOTAL_UNCOMPRESSED_BYTES) {
        reject('ARCHIVE_LIMIT_EXCEEDED', 'ZIP 解压条目或总字节数未通过限制检查');
    }

    const zipStat = await fs.stat(zipPath);
    if (totalUncompressed / Math.max(zipStat.size, 1) > MAX_COMPRESSION_RATIO) {
        reject('ARCHIVE_LIMIT_EXCEEDED', 'ZIP 压缩比超过允许上限');
    }

    const { stdout: permissions } = await runArchiveCommand('zipinfo', ['-l', zipPath]);
    for (const entry of entries) {
        const metadataLine = String(permissions).split(/\r?\n/).find((line) => line.endsWith(` ${entry}`));
        if (!metadataLine || !/^[dl-][rwx-]{9}\s/.test(metadataLine)) {
            reject('STATIC_VALIDATION_FAILED', `无法验证 ZIP 条目元数据：${entry}`);
        }
        const kind = metadataLine[0];
        const mode = metadataLine.slice(1, 10);
        if (kind === 'l' || (kind === '-' && mode.includes('x'))) {
            reject('STATIC_VALIDATION_FAILED', `ZIP 含链接或可执行文件：${entry}`);
        }
    }
};

const listRegularFiles = async (rootDir, relativeDir = '') => {
    const currentDir = path.join(rootDir, relativeDir);
    const children = await fs.readdir(currentDir, { withFileTypes: true });
    const files = [];
    for (const child of children) {
        const relativePath = path.posix.join(relativeDir.split(path.sep).join('/'), child.name);
        const absolutePath = path.join(rootDir, relativePath);
        const stat = await fs.lstat(absolutePath);
        if (stat.isSymbolicLink() || !stat.isFile() && !stat.isDirectory()) {
            reject('STATIC_VALIDATION_FAILED', `解压后发现不安全文件类型：site/${relativePath}`);
        }
        if (stat.isDirectory()) {
            files.push(...await listRegularFiles(rootDir, relativePath));
        } else {
            files.push({ relativePath: relativePath.split(path.sep).join('/'), absolutePath, size: stat.size });
        }
    }
    return files;
};

const assertReleaseRelativeStaticPaths = async (siteDir, files) => {
    const textExtensions = new Set(['.html', '.css', '.js', '.mjs']);
    const localPaths = new Set(files.map((file) => file.relativePath));
    const quotedRootPath = /['"](\/[^'"\s?#]+)(?:[?#][^'"]*)?['"]/g;

    for (const file of files) {
        if (!textExtensions.has(path.posix.extname(file.relativePath).toLowerCase())) continue;
        const text = await fs.readFile(file.absolutePath, 'utf8');
        for (const match of text.matchAll(quotedRootPath)) {
            const referencedPath = match[1].slice(1);
            if (localPaths.has(referencedPath)) {
                reject(
                    'STATIC_VALIDATION_FAILED',
                    `site/${file.relativePath} 使用根绝对静态资源路径 ${match[1]}；release 子路径部署必须使用相对路径`,
                );
            }
        }
    }
};

const validateExtractedArtifact = async (extractedDir) => {
    let manifest;
    let dossier;
    try {
        manifest = JSON.parse(await fs.readFile(path.join(extractedDir, 'artifact-manifest.json'), 'utf8'));
        dossier = JSON.parse(await fs.readFile(path.join(extractedDir, 'deployment-dossier.json'), 'utf8'));
    } catch {
        reject('STATIC_VALIDATION_FAILED', 'manifest 或 dossier 不是有效 JSON');
    }
    if (!Array.isArray(manifest.files) || dossier?.source?.type !== 'local-static-artifact' || (dossier?.safeToSubmit !== true && dossier?.topology?.safeToSubmit !== true)) {
        reject('STATIC_VALIDATION_FAILED', 'manifest 或 dossier 未满足静态发布断言');
    }

    const siteDir = path.join(extractedDir, 'site');
    const files = await listRegularFiles(siteDir);
    const expected = new Map();
    for (const file of manifest.files) {
        const declaredSize = file?.size ?? file?.bytes;
        if (!file || typeof file.path !== 'string' || typeof file.sha256 !== 'string' || !Number.isInteger(declaredSize) || !file.path.startsWith('site/')) {
            reject('STATIC_VALIDATION_FAILED', 'manifest 文件记录格式无效');
        }
        const relativePath = file.path.slice('site/'.length);
        if (!relativePath || relativePath.split('/').includes('..') || expected.has(relativePath)) {
            reject('STATIC_VALIDATION_FAILED', 'manifest 文件路径无效或重复');
        }
        expected.set(relativePath, { ...file, size: declaredSize });
    }
    if (expected.size !== files.length) {
        reject('STATIC_VALIDATION_FAILED', 'manifest 文件清单与解压 site 文件数量不一致');
    }

    await assertReleaseRelativeStaticPaths(siteDir, files);
    for (const file of files) {
        const expectedFile = expected.get(file.relativePath);
        const actualSha256 = await sha256File(file.absolutePath);
        if (!expectedFile || expectedFile.size !== file.size || expectedFile.sha256.toLowerCase() !== actualSha256) {
            reject('STATIC_VALIDATION_FAILED', `manifest 校验失败：site/${file.relativePath}`);
        }
        await fs.chmod(file.absolutePath, 0o644);
    }
    return siteDir;
};

const defaultVerifyPublicUrl = async (url) => {
    const response = await fetch(`${url}?verify=${Date.now()}`, { signal: AbortSignal.timeout(15_000), redirect: 'error' });
    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();
    return { status: response.status, contentType, body };
};

export const deployStaticZip = async ({ content, downloadsDir, publicBaseUrl, verifyPublicUrl = defaultVerifyPublicUrl }) => {
    const releaseRoot = path.resolve(downloadsDir, 'static-releases');
    let stagingDir;
    let releasePath;
    try {
        const { zipPath, zipSha256 } = await resolveTrustedZipPath({ content, downloadsDir });
        const entries = await getArchiveEntries(zipPath);
        await validateZipMetadata(zipPath, entries);

        const releaseId = `release-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
        stagingDir = assertWithin(path.join(releaseRoot, `.staging-${releaseId}`), releaseRoot, 'STATIC_VALIDATION_FAILED');
        releasePath = assertWithin(path.join(releaseRoot, releaseId), releaseRoot, 'STATIC_VALIDATION_FAILED');
        await fs.mkdir(stagingDir, { recursive: true, mode: 0o755 });
        await runArchiveCommand('unzip', ['-qq', zipPath, '-d', stagingDir]);
        const siteDir = await validateExtractedArtifact(stagingDir);

        await fs.mkdir(releaseRoot, { recursive: true, mode: 0o755 });
        await fs.rename(siteDir, releasePath);
        await fs.rm(stagingDir, { recursive: true, force: true });
        stagingDir = undefined;

        const url = `${String(publicBaseUrl).replace(/\/$/, '')}/${releaseId}/`;
        const verification = await verifyPublicUrl(url);
        if (verification?.status < 200 || verification?.status >= 300 || !String(verification?.contentType || '').toLowerCase().includes('text/html') || !String(verification?.body || '').trim()) {
            reject('HTTP_VERIFICATION_FAILED', '公开 release URL 未返回非空 HTML 2xx 响应');
        }
        return {
            status: 'deployed',
            releaseId,
            url,
            zipSha256,
            httpVerification: { status: verification.status, contentType: verification.contentType },
        };
    } catch (error) {
        if (releasePath) await fs.rm(releasePath, { recursive: true, force: true });
        if (stagingDir) await fs.rm(stagingDir, { recursive: true, force: true });
        if (error instanceof DeploymentRejected) {
            return { status: 'rejected', reason: error.reason, checks: error.checks };
        }
        console.error('[deployment] static ZIP release failed:', error);
        return { status: 'rejected', reason: 'DEPLOYMENT_INTERNAL_ERROR', checks: ['部署端内部验证失败'] };
    }
};
