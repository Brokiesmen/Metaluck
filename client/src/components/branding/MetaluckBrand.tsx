import { MetaluckMark } from './MetaluckMark';
import { MetaluckWordmark } from './MetaluckWordmark';

type Layout = 'horizontal' | 'vertical' | 'mark-only' | 'wordmark-only';

interface Props {
  layout?: Layout;
  /** Высота знака в px (ширина подписи по вертикали подстраивается) */
  markSize?: number;
  className?: string;
}

/**
 * Логотип + название: можно показывать вместе или по отдельности (`mark-only` / `wordmark-only`).
 */
export function MetaluckBrand({
  layout = 'horizontal',
  markSize = 26,
  className,
}: Props) {
  const mark = <MetaluckMark size={markSize} title="METALUCK" />;
  const word = <MetaluckWordmark />;

  if (layout === 'mark-only') {
    return <div className={`metaluck-brand metaluck-brand--mark-only ${className ?? ''}`.trim()}>{mark}</div>;
  }
  if (layout === 'wordmark-only') {
    return <div className={`metaluck-brand metaluck-brand--wordmark-only ${className ?? ''}`.trim()}>{word}</div>;
  }
  if (layout === 'vertical') {
    return (
      <div className={`metaluck-brand metaluck-brand--vertical ${className ?? ''}`.trim()}>
        {mark}
        {word}
      </div>
    );
  }

  return (
    <div className={`metaluck-brand metaluck-brand--horizontal ${className ?? ''}`.trim()}>
      {mark}
      {word}
    </div>
  );
}
