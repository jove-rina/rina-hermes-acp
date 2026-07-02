import {
    tokenUsageRing,
    tokenUsageArc,
    tokenUsagePct,
    TOKEN_RING_CIRCUMFERENCE,
} from '../core/dom-refs.js';
import { formatTokenCount } from '../utils/format.js';

/** @param {Record<string, Function>} deps */
export function createTokenUsage(deps) {
    function updateTokenUsage(used, size) {
        if (!tokenUsageRing || !tokenUsageArc) return;
        const usedTokens = Math.max(0, Number(used) || 0);
        const totalTokens = Math.max(0, Number(size) || 0);
        if (totalTokens <= 0) {
            tokenUsageRing.hidden = true;
            return;
        }
        const pct = Math.min(100, Math.round((usedTokens / totalTokens) * 100));
        const filled = (pct / 100) * TOKEN_RING_CIRCUMFERENCE;
        tokenUsageArc.style.strokeDasharray = filled + ' ' + TOKEN_RING_CIRCUMFERENCE;
        const level = pct >= 90 ? 'high' : pct >= 70 ? 'medium' : 'low';
        tokenUsageRing.dataset.level = level;
        if (tokenUsagePct) {
            tokenUsagePct.textContent = pct + '%';
            tokenUsagePct.style.fontSize = pct >= 100 ? '7px' : '8px';
        }
        const label = deps.localeText(
            'tokenUsageLabel',
            formatTokenCount(usedTokens),
            formatTokenCount(totalTokens),
            pct,
        );
        tokenUsageRing.title = label;
        tokenUsageRing.setAttribute('aria-label', label);
        tokenUsageRing.hidden = false;
    }

    return { updateTokenUsage };
}
