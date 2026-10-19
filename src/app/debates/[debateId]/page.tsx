import { DebateRoom } from "@/features/debates/components/DebateRoom";

export default async function DebatePage({ params }: { params: Promise<{ debateId: string }> }) {
  const { debateId } = await params;
  return <DebateRoom key={debateId} debateId={debateId} />;
}
