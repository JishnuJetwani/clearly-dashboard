import { redirect } from "next/navigation";

export default function Home() {
  // Make the dashboard the default landing page.
  redirect("/dashboard");
}
