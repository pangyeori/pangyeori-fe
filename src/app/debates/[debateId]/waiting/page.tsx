import { WaitingRoom } from "@/features/debates/components/WaitingRoom";

export default async function WaitingPage({
  params,
  searchParams,
}: {
  params: Promise<{ debateId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const [{ debateId }, { token }] = await Promise.all([params, searchParams]);
  return <WaitingRoom debateId={debateId} inviteToken={token ?? ""} />;
}
