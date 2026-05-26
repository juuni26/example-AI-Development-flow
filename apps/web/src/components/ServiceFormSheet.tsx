import type { JSX } from "react";
import { useEffect } from "react";
import { useForm, type UseFormSetError } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  categorySchema,
  statusSchema,
  type CreateServiceRequest,
  type Service,
  type UpdateServiceRequest,
} from "@cleandrop/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useCompaniesQuery } from "@/lib/use-companies-query";
import { useCreateService, useUpdateService } from "@/lib/use-service-mutations";
import { parseApiError } from "@/lib/api-error";

// The form layer works in major units (EUR, not cents) so the user can type
// "159.00" naturally. We multiply on submit before hitting the API.
const formValuesSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().min(1, "Description is required").max(2000),
  category: categorySchema,
  companyId: z.string().uuid({ message: "Pick a company" }),
  status: statusSchema,
  durationMinutes: z.coerce
    .number()
    .int("Whole minutes")
    .min(1, "Must be at least 1 minute")
    .max(1440),
  basePriceMajor: z.coerce
    .number()
    .min(0, "Base price cannot be negative")
    .max(1_000_000, "Base price out of range"),
});
type FormValues = z.infer<typeof formValuesSchema>;

const DEFAULTS: FormValues = {
  name: "",
  description: "",
  category: "Residential",
  companyId: "",
  status: "Draft",
  durationMinutes: 60,
  basePriceMajor: 0,
};

const valuesFromService = (s: Service): FormValues => ({
  name: s.name,
  description: s.description,
  category: s.category,
  companyId: s.company.id,
  status: s.status,
  durationMinutes: s.durationMinutes,
  basePriceMajor: s.basePriceCents / 100,
});

interface ServiceFormSheetProps {
  open: boolean;
  /** When provided, the sheet is in Edit mode and `service.id` is the target. */
  service?: Service | null;
  onOpenChange: (open: boolean) => void;
}

export function ServiceFormSheet({
  open,
  service,
  onOpenChange,
}: ServiceFormSheetProps): JSX.Element {
  const companies = useCompaniesQuery(open);
  const create = useCreateService();
  const update = useUpdateService();
  const editing = Boolean(service);

  const form = useForm<FormValues>({
    resolver: zodResolver(formValuesSchema),
    defaultValues: DEFAULTS,
  });

  // Reset when opening or when the target service changes (Edit → different row).
  useEffect(() => {
    if (!open) return;
    form.reset(service ? valuesFromService(service) : DEFAULTS);
  }, [open, service, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    const payload: CreateServiceRequest = {
      name: values.name.trim(),
      description: values.description.trim(),
      category: values.category,
      companyId: values.companyId,
      status: values.status,
      durationMinutes: Number(values.durationMinutes),
      basePriceCents: Math.round(values.basePriceMajor * 100),
    };

    try {
      if (editing && service) {
        const patch: UpdateServiceRequest = payload;
        await update.mutateAsync({ id: service.id, body: patch });
        toast.success("Service updated");
      } else {
        await create.mutateAsync(payload);
        toast.success("Service created");
      }
      onOpenChange(false);
    } catch (err) {
      handleApiError(err, form.setError);
    }
  });

  const submitting = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editing ? "Edit service" : "New service"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Update the details of this service. Changes apply immediately."
              : "Add a new service to your catalog."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-y-auto" noValidate>
          <div className="space-y-5 px-6 py-5">
            <Field label="Name" error={form.formState.errors.name?.message} htmlFor="svc-name">
              <Input id="svc-name" autoFocus {...form.register("name")} />
            </Field>

            <Field
              label="Description"
              error={form.formState.errors.description?.message}
              htmlFor="svc-desc"
            >
              <Textarea id="svc-desc" rows={3} {...form.register("description")} />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Category"
                error={form.formState.errors.category?.message}
                htmlFor="svc-category"
              >
                <Select
                  value={form.watch("category")}
                  onValueChange={(v) =>
                    form.setValue("category", v as never, { shouldDirty: true })
                  }
                >
                  <SelectTrigger id="svc-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorySchema.options.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field
                label="Status"
                error={form.formState.errors.status?.message}
                htmlFor="svc-status"
              >
                <Select
                  value={form.watch("status")}
                  onValueChange={(v) => form.setValue("status", v as never, { shouldDirty: true })}
                >
                  <SelectTrigger id="svc-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusSchema.options.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field
              label="Company"
              error={form.formState.errors.companyId?.message}
              htmlFor="svc-company"
            >
              <Select
                value={form.watch("companyId")}
                onValueChange={(v) => form.setValue("companyId", v, { shouldDirty: true })}
                disabled={!companies.data}
              >
                <SelectTrigger id="svc-company">
                  <SelectValue
                    placeholder={companies.isLoading ? "Loading companies…" : "Select a company"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {(companies.data ?? []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field
                label="Duration (minutes)"
                error={form.formState.errors.durationMinutes?.message}
                htmlFor="svc-duration"
              >
                <Input
                  id="svc-duration"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1440}
                  step={1}
                  {...form.register("durationMinutes", { valueAsNumber: true })}
                />
              </Field>

              <Field
                label="Base price (EUR)"
                error={form.formState.errors.basePriceMajor?.message}
                htmlFor="svc-price"
              >
                <Input
                  id="svc-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={1}
                  {...form.register("basePriceMajor", { valueAsNumber: true })}
                />
              </Field>
            </div>

            {form.formState.errors.root ? (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {form.formState.errors.root.message}
              </div>
            ) : null}
          </div>

          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? editing
                  ? "Saving…"
                  : "Creating…"
                : editing
                  ? "Save changes"
                  : "Create service"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor: string;
  children: JSX.Element;
}): JSX.Element {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function handleApiError(err: unknown, setError: UseFormSetError<FormValues>): void {
  const parsed = parseApiError(err);
  if (parsed.fieldErrors) {
    const known = new Set<keyof FormValues>([
      "name",
      "description",
      "category",
      "companyId",
      "status",
      "durationMinutes",
    ]);
    let assignedField = false;
    for (const [path, message] of Object.entries(parsed.fieldErrors)) {
      const key = path as keyof FormValues;
      if (known.has(key)) {
        setError(key, { type: "server", message });
        assignedField = true;
      } else if (path === "basePriceCents") {
        setError("basePriceMajor", { type: "server", message });
        assignedField = true;
      }
    }
    if (!assignedField) {
      setError("root", { type: "server", message: parsed.message });
    }
  } else {
    setError("root", { type: "server", message: parsed.message });
  }
  toast.error(parsed.message);
}
