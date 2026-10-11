"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { Spinner } from "@/components/ui/feedback";
import { useAuthStore } from "@/stores/auth-store";

export default function ChangePasswordPage() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (status === "unauthenticated") router.replace("/login");
  }, [status, router]);

  if (!user) {
    return <Spinner label="Checking your session" />;
  }

  return (
    <>
      <h1 className="text-3xl font-semibold">Choose a new password</h1>
      <p className="mt-1 mb-6 text-sm text-muted">
        {user.mustChangePassword
          ? "You are using a temporary password. Set your own before you continue."
          : "Update the password for your account."}
      </p>
      <ChangePasswordForm onDone={() => router.replace("/dashboard")} />
    </>
  );
}
