'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageDialogProps {
  open: boolean;
  onClose: () => void;
  type?: 'success' | 'error';
  title?: string;
  message?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
}

export function MessageDialog({
  open,
  onClose,
  type = 'error',
  title,
  message,
  confirmLabel = 'OK',
  onConfirm,
}: MessageDialogProps) {
  const isError = type === 'error';

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md rounded-xl shadow-lg">
        <DialogHeader className="text-center sm:text-center">
          <div
            className={cn(
              'mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-white shadow-md',
              isError
                ? 'from-red-500 to-red-600'
                : 'from-emerald-500 to-emerald-600'
            )}
          >
            {isError ? (
              <CircleAlert className="h-7 w-7" />
            ) : (
              <CheckCircle2 className="h-7 w-7" />
            )}
          </div>
          <DialogTitle className="text-lg font-bold text-gray-900">
            {title ?? (isError ? 'Something went wrong' : 'Success')}
          </DialogTitle>
          {message && (
            <DialogDescription className="text-sm text-gray-600">
              {message}
            </DialogDescription>
          )}
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              onClose();
              onConfirm?.();
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}