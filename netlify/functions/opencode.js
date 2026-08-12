// netlify/functions/opencode.js
// Proxy seguro para a API OpenCode.ai.
// Adiciona a chave secreta (AI_API_KEY) no lado do servidor,
// evitando expor a chave no navegador.

exports.handler = async function(event) {
  const apiKey = process.env.AI_API_KEY || process.env.VITE_AI_API_KEY;

  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "AI_API_KEY nao configurada nas variaveis de ambiente do Netlify." }),
    };
  }

  // event.path pode ser:
  //   /.netlify/functions/opencode/zen/go/v1/chat/completions
  //   /api/opencode_go/zen/go/v1/chat/completions
  //   /api/opencode_zen/zen/v1/chat/completions
  // Normaliza removendo qualquer prefixo de rota.
  const apiPath = (event.path || '')
    .replace(/^\/\.netlify\/functions\/opencode/, '')
    .replace(/^\/api\/opencode_(go|zen)/, '');

  const query = event.rawQuery ? `?${event.rawQuery}` : '';
  const targetUrl = `https://opencode.ai${apiPath}${query}`;

  console.log(`[Proxy Function] ${event.httpMethod} -> ${targetUrl}`);

  const headers = {
    'Content-Type': 'application/json',
    'Accept': '*/*',
    'Authorization': `Bearer ${apiKey}`,
    'User-Agent': 'prospex-netlify-proxy',
  };
  if (event.headers && event.headers['x-title']) headers['X-Title'] = event.headers['x-title'];
  if (event.headers && event.headers['http-referer']) headers['HTTP-Referer'] = event.headers['http-referer'];

  try {
    const response = await fetch(targetUrl, {
      method: event.httpMethod || 'GET',
      headers,
      body: event.body || undefined,
    });

    const data = await response.text();

    return {
      statusCode: response.status,
      body: data,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    };
  } catch (error) {
    console.error('[Proxy Function] Error forwarding request:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao encaminhar a requisicao.', details: String(error) }),
    };
  }
};