import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/** Phase 6 §8: /expenses is dead — /money is canonical. */
export default async function ExpensesRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/trips/${id}/money`);
}
