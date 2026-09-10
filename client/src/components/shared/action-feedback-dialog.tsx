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
import { CheckCircle2, XCircle, Info } from 'lucide-react';

interface ActionFeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export function ActionFeedbackDialog({
  open,
  onClose,
  type = 'info',
  title,
  message,
}: ActionFeedbackDialogProps) {
  const Icon =
    type === 'success' ? CheckCircle2 : type === 'error' ? XCircle : Info;
  const iconColor =
    type === 'success'
      ? 'text-green-500'
      : type === 'error'
        ? 'text-red-500'
        : 'text-blue-500';
  const titleColor =
    type === 'success'
      ? 'text-green-700'
      : type === 'error'
        ? 'text-red-700'
        : 'text-blue-700';

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-sm rounded-xl shadow-lg">
        <DialogHeader>
          <div className="flex flex-col items-center gap-3 text-center pt-2">
            <Icon className={`h-10 w-10 ${iconColor}`} />
            <DialogTitle className={`text-lg ${titleColor}`}>
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground whitespace-pre-wrap">
              {message}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            variant={type === 'error' ? 'destructive' : 'default'}
            onClick={onClose}
            className="min-w-24"
          >
            OK
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}