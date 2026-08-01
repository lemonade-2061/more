export type StepEvent = {
  stepped_at_ms: number;
  magnitude: number;
};

export type StepSummary = {
  user_id: string;
  from: string;
  to: string;
  total: number;
  per_minute: { minute: string; steps: number }[];
};

export async function postSteps(userId: string, events: StepEvent[]): Promise<number> {
  const res = await fetch("/api/steps", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, events }),
  });
  if (!res.ok) {
    throw new Error(`POST /api/steps failed: ${res.status}`);
  }
  const data = (await res.json()) as { inserted: number };
  return data.inserted;
}

// ページを閉じる/裏に回るときの取りこぼし防止用。fetch と違い応答を待たず確実に送る
export function postStepsBeacon(userId: string, events: StepEvent[]): boolean {
  const body = new Blob([JSON.stringify({ user_id: userId, events })], {
    type: "application/json",
  });
  return navigator.sendBeacon("/api/steps", body);
}

export async function fetchStepSummary(
  userId: string,
  range?: { from: Date; to: Date },
): Promise<StepSummary> {
  const params = new URLSearchParams({ user_id: userId });
  if (range) {
    params.set("from", range.from.toISOString());
    params.set("to", range.to.toISOString());
  }
  const res = await fetch(`/api/steps/summary?${params}`);
  if (!res.ok) {
    throw new Error(`GET /api/steps/summary failed: ${res.status}`);
  }
  return (await res.json()) as StepSummary;
}
