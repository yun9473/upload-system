export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const { paUrl, fileName, folderPath, fileContent } = req.body;

  if (!paUrl || !fileName || !folderPath || !fileContent) {
    return res.status(400).json({ error: '필수 파라미터 누락' });
  }

  try {
    const response = await fetch(paUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName, folderPath, fileContent }),
    });

    if (response.ok) {
      return res.status(200).json({ ok: true });
    } else {
      const text = await response.text().catch(() => '');
      return res.status(response.status).json({ error: text.slice(0, 200) });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
