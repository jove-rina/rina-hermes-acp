import { describe, it } from 'mocha';
import assert from 'assert';
import { HERMES_DEFAULT_PROFILE, normalizeHermesCliProfile, scopeKeyForCliProfile } from '../../acp/hermesProfile';

describe('hermesProfile', () => {
    it('normalizeHermesCliProfile maps empty values to default', () => {
        assert.strictEqual(normalizeHermesCliProfile(undefined), HERMES_DEFAULT_PROFILE);
        assert.strictEqual(normalizeHermesCliProfile(''), HERMES_DEFAULT_PROFILE);
        assert.strictEqual(normalizeHermesCliProfile('default'), HERMES_DEFAULT_PROFILE);
    });

    it('normalizeHermesCliProfile preserves named profiles', () => {
        assert.strictEqual(normalizeHermesCliProfile('jove'), 'jove');
        assert.strictEqual(normalizeHermesCliProfile('  rina  '), 'rina');
    });

    it('scopeKeyForCliProfile maps default profile to __default__', () => {
        assert.strictEqual(scopeKeyForCliProfile('default'), '__default__');
        assert.strictEqual(scopeKeyForCliProfile(''), '__default__');
        assert.strictEqual(scopeKeyForCliProfile('jove'), 'jove');
    });
});
