export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getShape } from "@/lib/actions/shape";

interface Props {
  params: Promise<{ id: string }>;
}

/**
 * «الباقة» is superseded by the route → shape → days flow.
 *
 * The screen this used to render listed every day of the trip as its own
 * accordion, which turned out to be the same overwhelm as the wizard it
 * replaced. Rather than leave a second planner reachable — having two was
 * the original complaint — this forwards to whichever half of the new flow
 * applies, so old links and bookmarks keep working.
 */
export default async function PackagePage({ params }: Props) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const shape = await getShape(id).catch(() => null);
  redirect(shape ? `/trips/${id}/shape` : `/trips/${id}/routes`);
}
