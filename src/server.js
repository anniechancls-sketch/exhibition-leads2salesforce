const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');

// ============== 配置区 ==============
const PORT = 3000;
const API_KEY = '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';
const MODEL = 'qwen/qwen3.5-flash-02-23';
// =====================================

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // ============== 处理 GET 请求 - 返回 HTML 页面 ==============
  if (req.method === 'GET') {
    // 根路径或 /index.html 返回主页面
    if (pathname === '/' || pathname === '/index.html') {
      const htmlPath = path.join(__dirname, 'public', 'index-proxy.html');
      fs.readFile(htmlPath, 'utf8', (err, data) => {
        if (err) {
          console.error('读取文件失败:', err);
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Page not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      });
      return;
    }
    
    // 处理其他静态文件（如果需要）
    // 这里可以添加对 CSS、JS 等静态资源的支持
    const publicPath = path.join(__dirname, 'public', pathname);
    fs.access(publicPath, fs.constants.F_OK, (err) => {
      if (!err && pathname !== '/') {
        // 文件存在，读取并返回
        fs.readFile(publicPath, (err, data) => {
          if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
            return;
          }
          // 根据文件扩展名设置 Content-Type
          const ext = path.extname(publicPath);
          const contentType = {
            '.html': 'text/html',
            '.css': 'text/css',
            '.js': 'application/javascript',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.gif': 'image/gif',
            '.svg': 'image/svg+xml'
          }[ext] || 'text/plain';
          
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(data);
        });
        return;
      }
      
      // 文件不存在
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    });
    return;
  }

  // ============== 处理 POST 请求 - API 调用 ==============
  if (req.method === 'POST' && pathname === '/recognize') {
    try {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const data = JSON.parse(body);

          // 调用 OpenRouter API
          const openrouterData = JSON.stringify({
            model: MODEL,
            messages: data.messages,
            max_tokens: 4096
          });

          const options = {
            hostname: 'openrouter.ai',
            port: 443,
            path: '/api/v1/chat/completions',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${API_KEY}`,
              'HTTP-Referer': `http://${getLocalIp()}:${PORT}`,
              'X-Title': 'RIIFO LeadCapture'
            }
          };

          const proxyReq = https.request(options, (proxyRes) => {
            let responseBody = '';
            proxyRes.on('data', chunk => responseBody += chunk);
            proxyRes.on('end', () => {
              res.writeHead(proxyRes.statusCode, { 'Content-Type': 'application/json' });
              res.end(responseBody);
            });
          });

          proxyReq.on('error', (err) => {
            console.error('代理请求错误:', err);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message }));
          });

          proxyReq.write(openrouterData);
          proxyReq.end();
        } catch (parseErr) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
        }
      });
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 其他请求返回 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not Found' }));
});

// 获取本机 IP 地址
function getLocalIp() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const ip = getLocalIp();
  console.log(`
============================================
  RIIFO LeadCapture AI 代理服务已启动
  监听端口: ${PORT}
  使用模型: ${MODEL}
============================================
  本地访问: http://localhost:${PORT}
  远程访问: http://${ip}:${PORT}
  API 地址: http://${ip}:${PORT}/recognize
  `);
});