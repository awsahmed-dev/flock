// B6: Packing merged into the new /pack tab. Redirect preserves any
// existing links (revalidatePath, bookmarks).
import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PackingRedirect({ params }: Props) {
  const { id } = await params;
  redirect(`/trips/${id}/pack?view=packing`);
}
