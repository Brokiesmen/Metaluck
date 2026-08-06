import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export type ToastTone = 'win' | 'lose' | 'info';

interface Props {
  message: string;
  tone?: ToastTone;
  /** Сколько держать на экране (мс). */
  duration?: number;
  onDone: () => void;
}

/**
 * Короткое всплывающее уведомление.
 *
 * Портал в document.body — по той же причине, что и у ModalShell: position:fixed
 * внутри скроллящегося .page-content на iOS смещается. Автозакрытие по таймеру,
 * закрытие по тапу.
 */
export function Toast({ message, tone = 'info', duration = 2600, onDone }: Props) {
  // onDone держим в ref: родитель перерисовывается по поллингу/сокету раз в
  // секунду, и если бы колбэк стоял в зависимостях, таймер автозакрытия
  // сбрасывался бы на каждом ререндере и тост висел бы вечно.
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const id = window.setTimeout(() => onDoneRef.current(), duration);
    return () => window.clearTimeout(id);
  }, [duration]);

  return createPortal(
    <div className={`toast toast--${tone}`} role="status" onClick={onDone}>
      {message}
    </div>,
    document.body,
  );
}
