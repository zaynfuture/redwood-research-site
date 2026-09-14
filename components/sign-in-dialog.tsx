'use client';

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
          <span className="section-index">MEMBER ACCESS</span>
          <DialogTitle>
            Welcome <span className="serif-italic text-primary">back.</span>
          </DialogTitle>
          <DialogDescription>
            Sign in to your private research workspace and chatbot.
          </DialogDescription>
        </DialogHeader>
        <AuthForm mode="login" />
      </DialogContent>
    </Dialog>
  );
}
