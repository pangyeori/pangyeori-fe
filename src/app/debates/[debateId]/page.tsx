import { DebateRoom } from "@/features/debates/components/DebateRoom";

export default async function DebatePage({ params, searchParams }: {
  params: Promise<{ debateId: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const [{ debateId }, { view }] = await Promise.all([params, searchParams]);
  return <DebateRoom key={debateId} debateId={debateId} finalView={view === "final"} />;
}
