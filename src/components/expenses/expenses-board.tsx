"use client";

import { useTransition } from "react";
import { AddExpenseDialog } from "./add-expense-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { settleSplit, deleteExpense } from "@/lib/actions/expenses";
import { toast } from "sonner";
import { Receipt, CheckCircle2, Trash2 } from "lucide-react";
import { format } from "date-fns";

const CATEGORY_LABELS: Record<string, string> = {
  accommodation: "Accommodation",
  transport: "Transport",
  food: "Food & drinks",
  activity: "Activity",
  shopping: "Shopping",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  accommodation: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  transport: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  food: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  activity: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  shopping: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  other: "bg-muted text-muted-foreground",
};

interface Split {
  id: string;
  userId: string;
  amountOwed: number;
  settled: boolean;
  user?: { displayName: string } | null;
}

interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  category: string;
  expenseDate: string;
  notes: string | null;
  createdAt: Date;
  payer?: { displayName: string } | null;
  splits: Split[];
}

interface BalanceSummary {
  userId: string;
  displayName: string;
  totalPaid: number;
  totalOwed: number;
  net: number; // positive = owed money, negative = owes money
}

interface Props {
  tripId: string;
  userId: string;
  currency: string;
  expenses: Expense[];
  members: { userId: string; displayName: string }[];
}

function computeBalances(
  expenses: Expense[],
  members: { userId: string; displayName: string }[]
): BalanceSummary[] {
  const map = new Map<string, BalanceSummary>();

  for (const m of members) {
    map.set(m.userId, {
      userId: m.userId,
      displayName: m.displayName,
      totalPaid: 0,
      totalOwed: 0,
      net: 0,
    });
  }

  for (const exp of expenses) {
    const payer = map.get(exp.paidBy);
    if (payer) payer.totalPaid += exp.amount;

    for (const split of exp.splits) {
      if (!split.settled) {
        const debtor = map.get(split.userId);
        if (debtor) debtor.totalOwed += split.amountOwed;
      }
    }
  }

  for (const summary of map.values()) {
    summary.net = summary.totalPaid - summary.totalOwed;
  }

  return [...map.values()];
}

function ExpenseRow({
  expense,
  userId,
  isOwner,
}: {
  expense: Expense;
  userId: string;
  isOwner: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleSettle(splitId: string) {
    const fd = new FormData();
    fd.set("splitId", splitId);
    fd.set("tripId", expense.tripId);
    startTransition(async () => {
      try {
        await settleSplit(fd);
        toast.success("Marked as settled");
      } catch {
        toast.error("Failed to settle");
      }
    });
  }

  function handleDelete() {
    const fd = new FormData();
    fd.set("expenseId", expense.id);
    fd.set("tripId", expense.tripId);
    startTransition(async () => {
      try {
        await deleteExpense(fd);
        toast.success("Expense deleted");
      } catch {
        toast.error("Failed to delete expense");
      }
    });
  }

  const myOwedSplit = expense.splits.find((s) => s.userId === userId && !s.settled && expense.paidBy !== userId);

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.other
              }`}
            >
              {CATEGORY_LABELS[expense.category] || expense.category}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(expense.expenseDate), "MMM d, yyyy")}
            </span>
          </div>
          <p className="font-medium">{expense.title}</p>
          <p className="text-sm text-muted-foreground">
            Paid by{" "}
            <span className="font-medium text-foreground">
              {expense.paidBy === userId
                ? "you"
                : expense.payer?.displayName ?? "Unknown"}
            </span>
          </p>
          {expense.notes && (
            <p className="text-xs text-muted-foreground">{expense.notes}</p>
          )}
        </div>
        <div className="text-right space-y-1">
          <p className="text-lg font-bold tabular-nums">
            {expense.currency}{" "}
            {expense.amount.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
          {(expense.paidBy === userId || isOwner) && (
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Splits */}
      {expense.splits.length > 0 && (
        <div className="border-t pt-3 space-y-1.5">
          {expense.splits.map((split) => (
            <div key={split.id} className="flex items-center justify-between text-sm">
              <span className={split.settled ? "text-muted-foreground line-through" : ""}>
                {split.userId === userId ? "You" : split.user?.displayName ?? "Unknown"}
              </span>
              <div className="flex items-center gap-2">
                <span className={`tabular-nums ${split.settled ? "text-muted-foreground" : ""}`}>
                  {expense.currency}{" "}
                  {split.amountOwed.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                {split.settled ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                ) : split.userId === userId && expense.paidBy !== userId ? (
                  <button
                    onClick={() => handleSettle(split.id)}
                    disabled={isPending}
                    className="text-xs text-primary hover:underline"
                  >
                    Mark settled
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExpensesBoard({
  tripId,
  userId,
  currency,
  expenses: expenseList,
  members,
}: Props) {
  const isOwner = members.some(
    (m) => m.userId === userId
  );

  const totalSpend = expenseList.reduce((sum, e) => sum + e.amount, 0);
  const balances = computeBalances(expenseList, members);
  const myBalance = balances.find((b) => b.userId === userId);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Expenses</h2>
          <p className="text-sm text-muted-foreground">
            Track spending and who owes what
          </p>
        </div>
        <AddExpenseDialog tripId={tripId} />
      </div>

      {/* Summary cards */}
      {expenseList.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total spent</p>
            <p className="text-xl font-bold tabular-nums mt-1">
              {currency}{" "}
              {totalSpend.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          {myBalance && (
            <>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">You paid</p>
                <p className="text-xl font-bold tabular-nums mt-1">
                  {currency}{" "}
                  {myBalance.totalPaid.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs text-muted-foreground">You owe</p>
                <p
                  className={`text-xl font-bold tabular-nums mt-1 ${
                    myBalance.totalOwed > 0 ? "text-orange-600" : "text-green-600"
                  }`}
                >
                  {currency}{" "}
                  {myBalance.totalOwed.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Expense list */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
          All expenses · {expenseList.length}
        </h3>
        {expenseList.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No expenses yet</p>
            <p className="text-xs mt-1">Log the first one to start tracking</p>
          </div>
        ) : (
          <div className="space-y-3">
            {expenseList
              .sort(
                (a, b) =>
                  new Date(b.expenseDate).getTime() -
                  new Date(a.expenseDate).getTime()
              )
              .map((exp) => (
                <ExpenseRow
                  key={exp.id}
                  expense={exp}
                  userId={userId}
                  isOwner={isOwner}
                />
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
