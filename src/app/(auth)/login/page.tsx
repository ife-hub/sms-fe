"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { authService } from "@/services/auth";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";
import { loginSchema, type LoginValues } from "@/validation/schemas";

const DEMO_ACCOUNTS = [
  { role: "Super administrator", identifier: "superadmin", password: "Password123!" },
  { role: "Administrator", identifier: "admin", password: "Password123!" },
  { role: "Staff", identifier: "staff", password: "Password123!" },
  { role: "Student", identifier: "grn-2024-001", password: "Student#2026!" },
  { role: "Student (temporary password)", identifier: "grn-2024-002", password: "Temp#Pass2026" },
];

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: yupResolver(loginSchema) });

  const login = useMutation({
    mutationFn: authService.login,
    onSuccess: ({ accessToken, user }) => {
      setSession(accessToken, user);
      router.replace(user.mustChangePassword ? "/change-password" : "/dashboard");
    },
  });

  return (
    <>
      <h1 className="text-3xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-muted">Use the username or email your school gave you.</p>

      {params.get("reason") === "expired" && (
        <p role="status" className="mt-4 rounded-field bg-warn-soft px-3 py-2 text-sm text-warn">
          Your session ended. Sign in again to continue.
        </p>
      )}

      <form noValidate className="mt-6 space-y-4" onSubmit={handleSubmit((v) => login.mutate(v))}>
        <Field label="Username or email" htmlFor="identifier" error={errors.identifier?.message}>
          <Input id="identifier" autoComplete="username" autoFocus aria-invalid={!!errors.identifier} {...register("identifier")} />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register("password")} />
        </Field>
        {login.isError && (
          <p role="alert" className="rounded-field bg-danger-soft px-3 py-2 text-sm text-danger">
            {getErrorMessage(login.error, "We could not sign you in. Try again.")}
          </p>
        )}
        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>

      {process.env.NEXT_PUBLIC_USE_MOCKS === "true" && (
        <div className="mt-8 rounded-panel border border-dashed border-line p-4">
          <p className="text-sm font-semibold">Demo accounts</p>
          <p className="mb-3 text-xs text-muted">Shown only while the mock API is on. Click one to fill the form.</p>
          <ul className="space-y-1">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.identifier}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-field px-2 py-1.5 text-left text-sm hover:bg-ink/5"
                  onClick={() => {
                    setValue("identifier", a.identifier, { shouldValidate: true });
                    setValue("password", a.password, { shouldValidate: true });
                  }}
                >
                  <span>{a.role}</span>
                  <span className="text-xs text-muted">{a.identifier}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
