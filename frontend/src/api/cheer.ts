export type CheerResponse = {
  steps: number;
  goal: number;
  progress: number;
  zone: string;
  text: string;
};

// 計測開始からの進捗に応じた応援セリフをもらう
export async function fetchCheer(
  userId: string,
  goalSteps: number,
  from: Date,
): Promise<CheerResponse> {
  const params = new URLSearchParams({
    user_id: userId,
    goal: String(goalSteps),
    from: from.toISOString(),
  });
  const res = await fetch(`/api/cheer?${params}`);
  if (!res.ok) {
    throw new Error(`GET /api/cheer failed: ${res.status}`);
  }
  return (await res.json()) as CheerResponse;
}
