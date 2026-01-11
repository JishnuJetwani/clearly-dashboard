import DashboardClient from "./DashboardClient";
import { listCandidatesDb } from "@/lib/candidatesRepo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function DashboardPage() {
  const rows = await listCandidatesDb();
  return <DashboardClient initialRows={rows} />;
}
