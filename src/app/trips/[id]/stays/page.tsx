import { redirect } from "next/navigation";
import { staysHref } from "@/lib/stays";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ e?: string }>;
}

/**
 * Stays moved into Discover, as its Bookings tab, so it can be reached any
 * time rather than only from the NOW ticket. This keeps old links working.
 */
export default async function StaysRedirect({ params, searchParams }: Props) {
  const { id } = await params;
  const { e } = await searchParams;
  redirect(staysHref(id, e === "busy" || e === "notlive" ? `e=${e}` : ""));
}
