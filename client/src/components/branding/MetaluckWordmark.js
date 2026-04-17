import { jsx as _jsx } from "react/jsx-runtime";
/** Название платформы — только текст, без иконки */
export function MetaluckWordmark({ className }) {
    return (_jsx("span", { className: `metaluck-wordmark ${className ?? ''}`.trim(), children: "METALUCK" }));
}
