"use client";

import { useFieldArray, type UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { RELATIONSHIPS, type GuardianValues } from "@/validation/schemas";

export interface GuardiansFormValues {
  guardians: GuardianValues[];
}

export const emptyGuardian = (isPrimary = false): GuardianValues => ({
  fullName: "",
  relationship: "",
  email: undefined,
  phone: undefined,
  alternativePhone: undefined,
  address: undefined,
  isPrimary,
  isEmergency: isPrimary,
});

/** Repeating guardian contact block. These are contacts only: saving them creates no account. */
export function GuardianFields({ form }: { form: UseFormReturn<GuardiansFormValues> }) {
  const {
    control,
    register,
    setValue,
    getValues,
    formState: { errors },
  } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "guardians" });

  function makePrimary(index: number) {
    getValues("guardians").forEach((_, i) => setValue(`guardians.${i}.isPrimary`, i === index, { shouldDirty: true }));
  }

  return (
    <div className="space-y-4">
      {fields.length === 0 && <p className="text-sm text-muted">No guardian contacts yet.</p>}
      {fields.map((field, i) => {
        const e = errors.guardians?.[i];
        return (
          <div key={field.id} className="rounded-panel border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold">Guardian {i + 1}</p>
              <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} aria-label={`Remove guardian ${i + 1}`}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Remove
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor={`g${i}-name`} error={e?.fullName?.message} required>
                <Input id={`g${i}-name`} aria-invalid={!!e?.fullName} {...register(`guardians.${i}.fullName`)} />
              </Field>
              <Field label="Relationship" htmlFor={`g${i}-rel`} error={e?.relationship?.message} required>
                <Select id={`g${i}-rel`} aria-invalid={!!e?.relationship} {...register(`guardians.${i}.relationship`)}>
                  <option value="">Choose</option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Phone" htmlFor={`g${i}-phone`} error={e?.phone?.message}>
                <Input id={`g${i}-phone`} aria-invalid={!!e?.phone} {...register(`guardians.${i}.phone`)} />
              </Field>
              <Field label="Alternative phone" htmlFor={`g${i}-alt`} error={e?.alternativePhone?.message}>
                <Input id={`g${i}-alt`} aria-invalid={!!e?.alternativePhone} {...register(`guardians.${i}.alternativePhone`)} />
              </Field>
              <Field label="Email" htmlFor={`g${i}-email`} error={e?.email?.message} className="sm:col-span-2">
                <Input id={`g${i}-email`} type="email" aria-invalid={!!e?.email} {...register(`guardians.${i}.email`)} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-6 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox {...register(`guardians.${i}.isPrimary`)} onChange={(ev) => ev.target.checked && makePrimary(i)} />
                Primary contact
              </label>
              <label className="flex items-center gap-2">
                <Checkbox {...register(`guardians.${i}.isEmergency`)} />
                Emergency contact
              </label>
            </div>
          </div>
        );
      })}
      {typeof errors.guardians?.message === "string" && (
        <p role="alert" className="text-sm font-medium text-danger">
          {errors.guardians.message}
        </p>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={() => append(emptyGuardian(fields.length === 0))}>
        <Plus className="h-4 w-4" aria-hidden />
        Add a guardian
      </Button>
    </div>
  );
}
