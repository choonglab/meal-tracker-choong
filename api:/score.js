export default async function handler(req, res) {
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

[BS - 혈당]
공복혈당 115 기준. 정제 탄수화물/단순당에 엄격하게 반응.
- 감점: 단순당(설탕, 액상과당), 정제 탄수화물(흰쌀밥, 밀가루), 고GI 식품, 식이섬유 부족
- 유지/가점: 복합 탄수화물(잡곡, 현미), 풍부한 식이섬유, 단백질·지방과의 균형(혈당 스파이크 방지)

[BP - 혈압]
수축기 131 기준. 나트륨 과다 섭취를 집중 감점.
- 감점: 고나트륨(국물 요리, 찌개, 가공식품, 소스류), 자극적인 양념
- 유지/가점: 칼륨이 풍부한 채소류, 저염식, 원물 중심 식사

[CHOL - 콜레스테롤]
LDL 121 기준. 포화지방·트랜스지방 유무를 까다롭게 평가.
- 감점: 포화지방 많은 육류(삼겹살, 가공육), 튀김류, 트랜스지방
- 유지/가점: 불포화지방산(생선, 견과류, 올리브유), 수용성 식이섬유(요거트, 블루베리, 채소류)

[Score - 전체 점수]
단순 평균이 아님. 세 항목 중 가장 낮은 점수에 가중치를 두어 산출.
하나가 폭락하면 전체도 크게 떨어짐.

[등급]
90점 이상 = A, 80~89 = B, 70~79 = C, 69 이하 = D
플러스/마이너스 기호 절대 사용 금지.

[Prot]
점수 아님. 한 끼 단백질 추정량(g)만 기재.

[Comment]
[혈당], [혈압], [콜레], [프로틴] 4가지 관점에서 각 30자 내외 한국어 분석.
사용자의 실제 수치(혈당 115, 혈압 131, LDL 121)를 맥락으로 언급할 것.

식사: ${meal}
식사 유형: ${type}

반환 JSON 형식 (이것만 출력):
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
    // JSON 블록만 추출
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('JSON을 찾을 수 없음');
    const parsed = JSON.parse(match[0]);
    return res.status(200).json(parsed);
  } catch(e) {
    return res.status(500).json({ error: '채점 실패: ' + e.message });
  }
}
