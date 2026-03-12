import React, {useEffect} from 'react';

const ToastStack = ({toasts = [], onRemove}) => {
  useEffect(() => {
    if (!toasts.length) {
      return undefined;
    }

    const timers = toasts.map(toast =>
      setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration || 3200)
    );

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [toasts, onRemove]);

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="toastStack" role="status" aria-live="polite">
      {toasts.map(toast => (
        <article key={toast.id} className={`toastItem ${toast.type || 'info'}`}>
          <p>{toast.message}</p>
          <button type="button" className="toastClose" onClick={() => onRemove(toast.id)} aria-label="Dismiss">
            ×
          </button>
        </article>
      ))}
    </div>
  );
};

export default ToastStack;
