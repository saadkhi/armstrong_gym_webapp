import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean; // true = red confirm button, false = neutral
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = true,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0D0D0D] border border-white/15 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-5 relative animate-in fade-in zoom-in-95 duration-150">
        {/* Close */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon + Title */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-[#E51924]/15 border border-[#E51924]/25' : 'bg-white/5 border border-white/10'}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-[#E51924]' : 'text-white/60'}`} />
          </div>
          <h3 className="text-sm font-black text-white leading-tight">{title}</h3>
        </div>

        {/* Message */}
        <p className="text-xs text-white/60 leading-relaxed pl-[52px] -mt-2">{message}</p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white/8 hover:bg-white/15 text-white/70 hover:text-white text-xs font-bold transition-all border border-white/10"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 rounded-xl text-white text-xs font-extrabold transition-all shadow-lg ${
              danger
                ? 'bg-[#E51924] hover:bg-red-600 shadow-red-500/20'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
