"use client";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ChangePasswordForm } from "@/components/forms/change-password-form";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/auth-store";
import { ROLE_LABELS } from "@/lib/permissions";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user)!;
  return (
    <>
      <PageHeader title="Account settings" description="Your sign-in details and password." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Your account" />
          <CardBody>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Name</dt>
                <dd className="font-medium">
                  {user.firstName} {user.lastName}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Username</dt>
                <dd className="font-medium">{user.username}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Role</dt>
                <dd>
                  <Badge tone="info">{ROLE_LABELS[user.role]}</Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">School</dt>
                <dd className="font-medium">{user.schoolName}</dd>
              </div>
            </dl>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Change password" />
          <CardBody>
            <ChangePasswordForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
