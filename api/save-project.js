// Vercel 서버리스 함수: GitHub에 프로젝트 JSON 저장
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN 미설정' });

  const { action, id, data } = req.body || {};
  if (!action) return res.status(400).json({ error: 'action 필요' });

  const repo = 'yun9473/upload-system';
  const headers = {
    Authorization: `token ${token}`,
    Accept: 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'upload-system',
  };

  async function getFileSha(path) {
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, { headers });
    if (!r.ok) return null;
    return (await r.json()).sha;
  }

  async function putFile(path, content, message) {
    const sha = await getFileSha(path);
    const r = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        ...(sha ? { sha } : {}),
      }),
    });
    if (!r.ok) throw new Error(await r.text());
  }

  try {
    if (action === 'save') {
      // 1. 프로젝트 파일 저장
      await putFile(
        `data/projects/${id}.json`,
        JSON.stringify(data, null, 2),
        `project: ${id}`
      );

      // 2. index.json 업데이트
      let index = [];
      const idxSha = await getFileSha('data/projects/index.json');
      if (idxSha) {
        const r = await fetch(`https://raw.githubusercontent.com/${repo}/main/data/projects/index.json`);
        if (r.ok) index = await r.json();
      }
      // 기존 항목 교체 또는 추가
      const existing = index.findIndex(p => p.id === id);
      const meta = { id, name: data.name, 교육청: data.교육청, year: data.year };
      if (existing >= 0) index[existing] = meta;
      else index.push(meta);

      await putFile('data/projects/index.json', JSON.stringify(index, null, 2), `index: ${id}`);
      return res.json({ success: true });
    }

    if (action === 'delete') {
      // 파일 삭제
      const sha = await getFileSha(`data/projects/${id}.json`);
      if (sha) {
        await fetch(`https://api.github.com/repos/${repo}/contents/data/projects/${id}.json`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ message: `delete: ${id}`, sha }),
        });
      }
      // index.json에서 제거
      const r = await fetch(`https://raw.githubusercontent.com/${repo}/main/data/projects/index.json`);
      if (r.ok) {
        const index = (await r.json()).filter(p => p.id !== id);
        await putFile('data/projects/index.json', JSON.stringify(index, null, 2), `index remove: ${id}`);
      }
      return res.json({ success: true });
    }

    res.status(400).json({ error: 'unknown action' });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
