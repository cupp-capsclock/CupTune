'use client';
import { useEffect, useState } from 'react';
import { useDialogs } from '@/stores/dialogs';
import Modal from './Modal';

export default function DialogHost() {
  const { confirmState, promptState, closeConfirm, closePrompt } = useDialogs();
  const [text, setText] = useState('');

  useEffect(() => {
    if (promptState) setText(promptState.initial ?? '');
  }, [promptState]);

  return (
    <>
      <Modal open={!!confirmState} onClose={() => closeConfirm(false)} title={confirmState?.title ?? ''}>
        {confirmState?.message && <p className="mb-4 px-1 text-sm text-muted">{confirmState.message}</p>}
        <div className="flex justify-end gap-2">
          <button onClick={() => closeConfirm(false)} className="press rounded-full bg-surface2 px-4 py-2.5 text-sm font-medium">
            Batal
          </button>
          <button
            data-autofocus
            onClick={() => closeConfirm(true)}
            className={`press rounded-full px-4 py-2.5 text-sm font-semibold ${confirmState?.danger ? 'bg-red-500 text-white' : 'bg-accent text-accent-fg'}`}
          >
            {confirmState?.confirmLabel ?? 'Ya'}
          </button>
        </div>
      </Modal>

      <Modal open={!!promptState} onClose={() => closePrompt(null)} title={promptState?.title ?? ''}>
        <input
          data-autofocus
          value={text}
          maxLength={60}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && text.trim()) closePrompt(text.trim());
          }}
          placeholder={promptState?.placeholder}
          aria-label={promptState?.title}
          className="mb-4 w-full rounded-xl border border-line bg-surface2 px-4 py-3 text-sm outline-none focus:border-accent"
        />
        <div className="flex justify-end gap-2">
          <button onClick={() => closePrompt(null)} className="press rounded-full bg-surface2 px-4 py-2.5 text-sm font-medium">
            Batal
          </button>
          <button
            disabled={!text.trim()}
            onClick={() => closePrompt(text.trim())}
            className="press rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-40"
          >
            {promptState?.confirmLabel ?? 'Simpan'}
          </button>
        </div>
      </Modal>
    </>
  );
}
