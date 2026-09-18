import { JoinRoom } from "@/features/debates/components/JoinRoom";

export default async function JoinPage({ searchParams }: {
  searchParams: Promise<{ token?: string; debateId?: string }>;
}) {
  const { token, debateId } = await searchParams;
  return <JoinRoom inviteToken={token ?? ""} debateId={debateId ?? null} />;
}
