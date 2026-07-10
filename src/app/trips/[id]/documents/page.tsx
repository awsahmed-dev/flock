// Sprint 6: documents live in Huddle (Docs segment). Redirect preserves any
// existing links (chat cards, bookmarks, revalidatePath calls).
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentsRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/trips/${id}/huddle?tab=docs`);
}
