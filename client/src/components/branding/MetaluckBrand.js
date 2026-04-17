import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MetaluckMark } from './MetaluckMark';
import { MetaluckWordmark } from './MetaluckWordmark';
/**
 * Логотип + название: можно показывать вместе или по отдельности (`mark-only` / `wordmark-only`).
 */
export function MetaluckBrand({ layout = 'horizontal', markSize = 26, className, }) {
    const mark = _jsx(MetaluckMark, { size: markSize, title: "METALUCK" });
    const word = _jsx(MetaluckWordmark, {});
    if (layout === 'mark-only') {
        return _jsx("div", { className: `metaluck-brand metaluck-brand--mark-only ${className ?? ''}`.trim(), children: mark });
    }
    if (layout === 'wordmark-only') {
        return _jsx("div", { className: `metaluck-brand metaluck-brand--wordmark-only ${className ?? ''}`.trim(), children: word });
    }
    if (layout === 'vertical') {
        return (_jsxs("div", { className: `metaluck-brand metaluck-brand--vertical ${className ?? ''}`.trim(), children: [mark, word] }));
    }
    return (_jsxs("div", { className: `metaluck-brand metaluck-brand--horizontal ${className ?? ''}`.trim(), children: [mark, word] }));
}
