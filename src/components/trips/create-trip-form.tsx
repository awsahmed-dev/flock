"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { createTrip } from "@/lib/actions/trips";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/components/i18n/locale-provider";

const CURRENCIES = ["USD", "EUR", "GBP", "AED", "SAR", "JPY", "AUD", "CAD"];

export function CreateTripForm() {
  const t = useT();
  const [isPending, startTransition] = useTransition();
  const [currency, setCurrency] = useState("USD");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("currency", currency);
    startTransition(async () => {
      try {
        await createTrip(formData);
      } catch (err) {
        if (err instanceof Error && !err.message.includes("NEXT_REDIRECT")) {
          toast.error(err.message || "Something went wrong");
        }
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t("trip.tripName")} *</Label>
            <Input
              id="name"
              name="name"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="destination">{t("trip.destination")} *</Label>
            <Input
              id="destination"
              name="destination"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="startDate">{t("trip.startDate")} *</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="endDate">{t("trip.endDate")} *</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="budgetTotal">{t("trip.totalBudget")}</Label>
              <Input
                id="budgetTotal"
                name="budgetTotal"
                type="number"
                min="0"
                step="0.01"
                placeholder="2000"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currency">{t("trip.currency")}</Label>
              <select
                id="currency"
                name="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin me-2" />}
            {t("trip.createButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
