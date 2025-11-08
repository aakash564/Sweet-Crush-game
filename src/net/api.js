const BASE = location.origin;

export async function fetchScores() {
  const res = await fetch(`${BASE}/scores`);
  if (!res.ok) throw new Error('failed');
  return await res.json();
}

export async function submitScore(score) {
  const res = await fetch(`${BASE}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(score)
  });
  if (!res.ok) throw new Error('failed');
  return await res.json();
}

