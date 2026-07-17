import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const script = readFileSync(new URL('../start.sh', import.meta.url), 'utf8');

test('protects the switched candidate before persistent state and validates Nginx before draining', () => {
    const reloadIndex = script.indexOf('systemctl reload nginx');
    const switchedIndex = script.indexOf('switched=1', reloadIndex);
    const persistIndex = script.indexOf("printf '%s\\n' \"$next_color\" > \"$ACTIVE_COLOR_FILE\"");
    const nginxValidationIndex = script.lastIndexOf('verify_nginx_candidate');
    const drainIndex = script.indexOf('Scheduling background drain');

    assert.ok(reloadIndex >= 0, 'the deployment script must reload Nginx');
    assert.ok(switchedIndex > reloadIndex, 'the candidate must be protected only after reload succeeds');
    assert.ok(
        switchedIndex < persistIndex,
        'the candidate must be protected before active-color persistence can fail',
    );
    assert.ok(nginxValidationIndex > persistIndex, 'the switched Nginx path must be validated after persistence');
    assert.ok(drainIndex > nginxValidationIndex, 'the old color must drain only after Nginx validation');
});
