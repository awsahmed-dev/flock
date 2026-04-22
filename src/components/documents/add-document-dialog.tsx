"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createDocument } from "@/lib/actions/documents";
import { toast } from "sonner";
import { Plus } from "lucide-react";

interface Props {
  tripId: string;
}

export function AddDocumentDialog({ tripId }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createDocument(formData);
        toast.success("Link saved");
        setOpen(false);
        (e.target as HTMLFormElement).reset();
      } catch (err) {
        toast.error((err as Error).message || "Failed to save link");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm"><Plus className="w-4 h-4 mr-1" />Add link</Button>} />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add a link</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="tripId" value={tripId} />
          <input type="hidden" name="type" value="link" />

          <div className="space-y-1.5">
            <Label htmlFor="doc-title">Title</Label>
            <Input
              id="doc-title"
              name="title"
              placeholder="Visa requirements doc"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-url">URL</Label>
            <Input
              id="doc-url"
              name="url"
              type="url"
              placeholder="https://docs.google.com/..."
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="doc-day">Pin to day (optional)</Label>
            <Input id="doc-day" name="dayDate" type="date" />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? "Saving…" : "Save link"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
