module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { meal, type } = req.body;
  if (!meal) return res.status(400).json({ error: '식사 내용이 없음' });

  const prompt = `당신은 영양 전문가입니다. 아래 식사를 분석하고 JSON만 반환하세요. 다른 텍스트 없이 순수 JSON만 출력하세요.

사용자 개인 건강 수치 (채점 기준점):
- 공복혈당: 115 mg/dL
- 수축기 혈압: 131 mmHg
- LDL 콜레스테롤: 121 mg/dL

채점 기준 (각 100점 만점, 감점 방식):

[BS - 혈당] 공복혈당 115 기준. 정제 탄수화물/단순당에 엄격하게 반응.
감점: 단순당, 정제 탄수화물, 고GI 식품, 식이섬유 부족
유지/가점: 복합 탄수화물, 풍부한 식이섬유, 단백질·지방과의 균형

[BP - 혈압] 수축기 131 기준. 나트륨 과다 집중 감점.
감점: 고나트륨(국물, 찌개, 가공식품, 소스류)
유지/가점: 칼륨 풍부한 채소류, 저염식, 원물 중심

[CHOL - 콜레스테롤] LDL 121 기준. 포화지방·트랜스지방 평가.
감점: 포화지방 많은 육류, 튀김류, 트랜스지방
유지/가점: 불포화지방산(생선, 견과류), 수용성 식이섬유

[Score] 단순 평균 아님. 가장 낮은 항목에 가중치. 하나 폭락하면 전체도 크게 하락.
[등급] 90이상=A, 80~89=B, 70~79=C, 69이하=D. 플러스/마이너스 금지.
[Prot] 한 끼 단백질 추정량(g).
[Comment] [혈당] [혈압] [콜레] [프로틴] 4가지 관점, 각 30자 내외 한국어.

식사: ${meal}
식사 유형: ${type}

반환 JSON (이것만 출력):
{"BS":숫자,"BP":숫자,"CHOL":숫자,"Score":숫자,"Prot":숫자,"Kcal":숫자,"Comment":"[혈당] ... [혈압] ... [콜레] ... [프로틴] ..."}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 }
        })
      }
    );
    const data = await response.json();
    const raw = data.candidates[0].content.parts[0].text;
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON을 찾을 수 없음');
    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);
  } catch(e) {
    return res.status(500).json({ error: '채점 실패: ' + e.message });
  }
}
