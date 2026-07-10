import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

/** Phase 6 §4: Huddle replaces Chat entirely. */
export default async function ChatRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/trips/${id}/huddle`);
}
