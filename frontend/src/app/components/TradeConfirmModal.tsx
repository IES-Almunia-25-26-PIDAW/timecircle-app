import React from 'react';

interface Props {
  visible: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const TradeConfirmModal: React.FC<Props> = ({ visible, title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', onConfirm, onCancel }) => {
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
        <p className="text-slate-700 mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-slate-200">{cancelLabel}</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl bg-teal-600 text-white">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default TradeConfirmModal;
