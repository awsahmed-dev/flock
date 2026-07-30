import { redirect } from "next/navigation";

/**
 * Concept D was promoted to the homepage — this exploration route now
 * just forwards there so old preview links keep working.
 */
export default function VisionXPage() {
  redirect("/");
}
