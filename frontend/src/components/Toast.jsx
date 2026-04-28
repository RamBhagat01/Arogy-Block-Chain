import React, { useState, useEffect } from 'react';
import { Info, AlertTriangle, XCircle, X } from 'lucide-react';

export const toast = {
  success: (msg, title="Information") => window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg, title, type: 'success' } })),
  error: (msg, title="ERROR!") => window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg, title, type: 'error' } })),
  info: (msg, title="Information") => window.dispatchEvent(new CustomEvent('show-toast', { detail: { msg, title, type: 'info' } }))
};

export const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (e) => {
      const newToast = { id: Date.now(), ...e.detail };
      setToasts((prev) => [...prev, newToast]);
      
      // Auto-remove after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 5000);
    };

    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast-item toast-${t.type} animate-toast`}>
          <div className="toast-icon-wrapper">
             {t.type === 'success' ? <Info size={22} strokeWidth={2.5} /> : t.type === 'error' ? <AlertTriangle size={22} strokeWidth={2.5} /> : <Info size={22} strokeWidth={2.5} />}
          </div>
          <div className="toast-content">
             <strong className="toast-title">{t.title}</strong>
             <p className="toast-msg">{t.msg}</p>
          </div>
          <button className="toast-close-btn" onClick={() => removeToast(t.id)}>
             <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
};
