// B6: Documents merged into the new /pack tab. Redirect preserves any
// existing links (chat cards, bookmarks, revalidatePath calls).
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentsRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/trips/${id}/pack?view=docs`);
}
