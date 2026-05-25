import type { JSX } from "react";
import { useState } from "react";
import { toast } from "sonner";
import type { Service } from "@cleandrop/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteService } from "@/lib/use-service-mutations";
import { parseApiError } from "@/lib/api-error";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DeleteServiceDialogProps {
  service: Service | null;
  onOpenChange: (open: boolean) => void;
}

export function DeleteServiceDialog({ service, onOpenChange }: DeleteServiceDialogProps): JSX.Element {
  const remove = useDeleteService();
  const [submitting, setSubmitting] = useState(false);

  const onConfirm = async (): Promise<void> => {
    if (!service || submitting) return;
    setSubmitting(true);
    try {
      await remove.mutateAsync(service.id);
      toast.success(`Deleted "${service.name}"`);
      onOpenChange(false);
    } catch (err) {
      toast.error(parseApiError(err).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={Boolean(service)} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete service</AlertDialogTitle>
          <AlertDialogDescription>
            Delete <span className="font-semibold">"{service?.name ?? ""}"</span>? This cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              // Stop the AlertDialog's default close-on-action so we can keep
              // the dialog open while the network request is pending.
              e.preventDefault();
              void onConfirm();
            }}
            disabled={submitting}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            {submitting ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
