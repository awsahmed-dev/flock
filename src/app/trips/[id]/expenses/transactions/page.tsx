import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/** Phase 6 §8-C: transactions moved to /money/transactions. */
export default async function TransactionsRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/trips/${id}/money/transactions`);
}
