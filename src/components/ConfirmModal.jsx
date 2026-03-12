import React from 'react';

const ConfirmModal = ({open, title, message, confirmText = 'Confirm', cancelText = 'Cancel', loading = false, onConfirm, onCancel}) => {
  if (!open) {
    return null;
  }

  return (
    <div className="modalOverlay" role="dialog" aria-modal="true" aria-label={title || 'Confirm'}>
      <div className="modalCard">
        <h3>{title || 'Confirm action'}</h3>
        <p>{message || 'Are you sure?'}</p>
        <div className="modalActions">
          <button type="button" className="ghost" onClick={onCancel} disabled={loading}>
            {cancelText}
          </button>
          <button type="button" className="dangerBtn" onClick={onConfirm} disabled={loading}>
            {loading ? 'Please wait...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
