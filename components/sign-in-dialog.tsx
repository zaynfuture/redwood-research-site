'use client';

import { useLocale } from '@/components/locale-provider';
import { authCopy } from '@/lib/auth-copy';
import { AuthForm } from '@/components/auth-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function SignInDialog({ label }: { label: string }) {
  const copy = authCopy[useLocale().locale];
  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="button button-outline hidden sm:inline-flex"
            aria-label={label}
          />
        }
      >
        {label}
      </DialogTrigger>
      <DialogContent className="signin-dialog">
        <DialogHeader className="signin-dialog-header">
          <span className="section-index">{copy.member}</span>
          <DialogTitle>
            {copy.welcome}
          </DialogTitle>
          <DialogDescription>
            {copy.loginIntro}
          </DialogDescription>
        </DialogHeader>
        <AuthForm mode="login" />
      </DialogContent>
    </Dialog>
  );
}
