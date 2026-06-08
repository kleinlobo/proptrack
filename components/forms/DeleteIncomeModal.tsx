'use client';

import { useState, useTransition } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { deleteIncomeRecord } from '@/app/(dashboard)/income/actions';

interface Props {
  open: boolean;
  recordId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteIncomeModal({ open, recordId, onClose, onSuccess }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!recordId) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteIncomeRecord(recordId);
      if (result.error) { setError(result.error); return; }
      onSuccess();
      onClose();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-white dark:bg-neutral-800 rounded-md shadow-xl p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-[var(--color-error)]" aria-hidden="true" />
            </div>
            <DialogTitle className="text-base font-semibold text-[var(--color-neutral-900)]">
              Delete Income Record
            </DialogTitle>
          </div>
          <p className="text-sm text-[var(--color-neutral-600)] mb-2">
            This record will be permanently removed from the system. This action cannot be undone.
          </p>
          {error && (
            <p className="text-sm text-[var(--color-error)] mt-2">{error}</p>
          )}
        </DialogHeader>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-neutral-100 dark:border-neutral-700 mt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isPending}
            className="bg-[var(--color-error)] hover:bg-red-700 text-white"
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" aria-hidden="true" />}
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
