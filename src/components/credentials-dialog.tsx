"use client";

import { Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";

export function CredentialsDialog({
  credentials,
  onClose,
}: {
  credentials: { username: string; temporaryPassword: string } | null;
  onClose: () => void;
}) {
  async function copy() {
    if (!credentials) return;
    await navigator.clipboard.writeText(`Username: ${credentials.username}\nTemporary password: ${credentials.temporaryPassword}`);
    toast.success("Copied to clipboard");
  }
  return (
    <Dialog open={!!credentials} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title="Temporary sign-in details"
        description="Share these with the student now. The password is shown once and must be changed at first sign-in."
      >
        {credentials && (
          <>
            <dl className="space-y-3 rounded-field bg-paper p-4 text-sm">
              <div>
                <dt className="text-muted">Username</dt>
                <dd className="font-mono text-base font-semibold">{credentials.username}</dd>
              </div>
              <div>
                <dt className="text-muted">Temporary password</dt>
                <dd className="font-mono text-base font-semibold">{credentials.temporaryPassword}</dd>
              </div>
            </dl>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="secondary" onClick={copy}>
                <Copy className="h-4 w-4" aria-hidden />
                Copy
              </Button>
              <Button onClick={onClose}>Done</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
