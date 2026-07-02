import { describe, it, expect, vi } from 'vitest';

vi.mock('../core/vscode.js', () => ({ vscode: { postMessage: vi.fn() } }));
vi.mock('../core/dom-refs.js', () => ({ messagesEl: { querySelectorAll: vi.fn(() => []) } }));

import { isSelectableRole, getGroupRoleLabel } from '../messages/group-utils.js';

function mockGroup(className) {
    return {
        classList: {
            contains(name) {
                return name === className;
            },
        },
    };
}

describe('isSelectableRole', () => {
    it('accepts user, assistant, thought, tool', () => {
        expect(isSelectableRole('user')).toBe(true);
        expect(isSelectableRole('assistant')).toBe(true);
        expect(isSelectableRole('thought')).toBe(true);
        expect(isSelectableRole('tool')).toBe(true);
    });

    it('rejects permission and unknown roles', () => {
        expect(isSelectableRole('permission')).toBe(false);
        expect(isSelectableRole('system')).toBe(false);
    });
});

describe('getGroupRoleLabel', () => {
    const locale = {
        roleYou: 'You',
        roleHermes: 'Hermes',
        roleThought: 'Thought',
        roleTool: 'Tool',
        roleMessage: 'Message',
    };

    it('maps message group classes to locale labels', () => {
        expect(getGroupRoleLabel(mockGroup('user'), locale)).toBe('You');
        expect(getGroupRoleLabel(mockGroup('assistant'), locale)).toBe('Hermes');
        expect(getGroupRoleLabel(mockGroup('thought'), locale)).toBe('Thought');
        expect(getGroupRoleLabel(mockGroup('tool'), locale)).toBe('Tool');
    });

    it('falls back to roleMessage', () => {
        expect(getGroupRoleLabel(mockGroup('permission'), locale)).toBe('Message');
    });
});
