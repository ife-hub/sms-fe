"use client";

import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { authService } from "@/services/auth";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { changePasswordSchema, type ChangePasswordValues } from "@/validation/schemas";

export function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const setUser = useAuthStore((s) => s.setUser);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordValues>({ resolver: yupResolver(changePasswordSchema) });

  const mutation = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: ({ user }) => {
      setUser(user);
      toast.success("Password changed");
      reset();
      onDone?.();
    },
    onError: (e) => setError("currentPassword", { message: getErrorMessage(e) }),
  });

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={handleSubmit((v) => mutation.mutate({ currentPassword: v.currentPassword, newPassword: v.newPassword }))}
    >
      <Field label="Current password" htmlFor="currentPassword" error={errors.currentPassword?.message}>
        <Input id="currentPassword" type="password" autoComplete="current-password" aria-invalid={!!errors.currentPassword} {...register("currentPassword")} />
      </Field>
      <Field
        label="New password"
        htmlFor="newPassword"
        error={errors.newPassword?.message}
        hint="At least 10 characters with upper and lower case letters, a number and a symbol."
      >
        <Input id="newPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.newPassword} {...register("newPassword")} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={errors.confirmPassword?.message}>
        <Input id="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!errors.confirmPassword} {...register("confirmPassword")} />
      </Field>
      <Button type="submit" loading={mutation.isPending}>
        Change password
      </Button>
    </form>
  );
}
