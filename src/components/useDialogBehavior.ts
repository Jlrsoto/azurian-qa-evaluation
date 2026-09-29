import { useEffect, useRef } from 'react';

/**
 * Comportamiento común de los diálogos modales:
 * - Escape cierra el diálogo.
 * - Enfoca el primer elemento marcado con data-autofocus al abrir.
 * - Devuelve el foco al elemento que abrió el diálogo al cerrarse.
 */
export function useDialogBehavior(onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    containerRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  return containerRef;
}
