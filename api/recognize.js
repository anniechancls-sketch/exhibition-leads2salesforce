// Vercel Serverless API Route
// 环境变量: DASHSCOPE_API_KEY, MODEL_NAME

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const API_KEY = process.env.DASHSCOPE_API_KEY;
    const MODEL = process.env.MODEL_NAME || 'qwen3.5-27B';  // 视觉模型默认用 qwen-vl-plus

    if (!API_KEY) {
      return res.status(500).json({ error: 'DASHSCOPE_API_KEY not configured' });
    }

    const { messages } = req.body;

    const dashscopeResponse = await fetch('https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messages,
        max_tokens: 4096
      })
    });

    const data = await dashscopeResponse.json();

    return res.status(dashscopeResponse.status).json(data);
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
