export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });
  
  const PARDOT_URL = 'https://go.rifeng.com/l/900071/2026-03-18/3t99mv';
  
  try {
    let body = '';
    for await (const chunk of req) body += chunk;
    
    console.log('=== Pardot Submit ===');
    console.log('Body:', body);
    
    // 步骤 1: 先 GET 获取 Cookie
    const getResponse = await fetch(PARDOT_URL, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    // 获取 Set-Cookie 头
    const setCookieHeader = getResponse.headers.get('set-cookie');
    console.log('Cookies:', setCookieHeader);
    
    // 步骤 2: 用 Cookie POST 提交
    const postHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html'
    };
    
    // 如果有 Cookie，添加到请求头
    if (setCookieHeader) {
      // 提取 cookie 值
      const cookieMatch = setCookieHeader.match(/([^=]+=[^;]+)/);
      if (cookieMatch) {
        postHeaders['Cookie'] = cookieMatch[1];
      }
    }
    
    const postResponse = await fetch(PARDOT_URL, {
      method: 'POST',
      headers: postHeaders,
      body: body,
      redirect: 'manual'
    });
    
    const responseText = await postResponse.text();
    const statusCode = postResponse.status;
    const locationHeader = postResponse.headers.get('location');
    
    console.log('Status:', statusCode);
    console.log('Location:', locationHeader);
    
    res.status(200).json({
      success: statusCode === 302 && locationHeader && !locationHeader.includes('error'),
      status: statusCode,
      location: locationHeader,
      message: statusCode === 302 ? '提交成功' : '请检查状态'
    });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
}