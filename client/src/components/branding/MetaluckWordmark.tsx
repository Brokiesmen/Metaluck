interface Props {
  className?: string;
}

/** Название платформы — только текст, без иконки */
export function MetaluckWordmark({ className }: Props) {
  return (
    <span className={`metaluck-wordmark ${className ?? ''}`.trim()}>METALUCK</span>
  );
}
