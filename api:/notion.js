module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { token, dbId, meal, type, BS, BP, CHOL, Score, Prot, Kcal, Comment } = req.body;
  if (!token || !dbId || !meal) {
    return res.status(400).json({ error: '필수 값 누락' });
  }

  const now = new Date().toISOString();

  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: dbId },
        properties: {
          Meal: { title: [{ text: { content: meal } }] },
          Type: { select: { name: type } },
          Score: { number: Score },
          BS: { number: BS },
          BP: { number: BP },
          CHOL: { number: CHOL },
          Prot: { number: Prot },
          Kcal: { number: Kcal },
          Comments: { rich_text: [{ text: { content: Comment } }] },
          Date: { date: { start: now } }
        }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Notion 저장 실패' });
    }
    return res.status(200).json({ success: true, id: data.id });
  } catch(e) {
    return res.status(500).json({ error: '저장 실패: ' + e.message });
  }
}
