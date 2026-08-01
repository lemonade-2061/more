// 端末ごとの匿名ユーザーID。StepDebug と同じキーを使い、調整時の記録と本番を紐づける
export function getUserId(): string {
  let id = localStorage.getItem('step-user-id');
  if (!id) {
    id = 'user-' + Math.random().toString(36).slice(2, 8);
    localStorage.setItem('step-user-id', id);
  }
  return id;
}
