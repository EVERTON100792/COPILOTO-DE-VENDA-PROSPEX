const key = 'sk-Ij7Pnh4rZAO5LowBUVQuQxMCDD6dRotijpprSQ189yJkGtaBGqgqmuqgjwPw7D2L';

async function testOpenRouter() {
  const models = [
    'deepseek/deepseek-chat',
    'openai/gpt-4o-mini',
    'google/gemini-2.0-flash-001',
    'anthropic/claude-3.5-haiku'
  ];

  for (const model of models) {
    try {
      console.log('Testing OpenRouter model:', model);
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://prospex.app',
          'X-Title': 'Prospex Autopilot'
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: 'Você é um vendedor especialista em sites.' },
            { role: 'user', content: 'O cliente disse que esta sem dinheiro. Como responder?' }
          ]
        })
      });

      console.log('Status:', res.status);
      const data = await res.json();
      console.log('Response:', JSON.stringify(data, null, 2));
      if (res.ok) {
        console.log('\nSUCCESS! Output:\n', data.choices?.[0]?.message?.content);
        break;
      }
    } catch(e) {
      console.error('Error:', e.message);
    }
  }
}

testOpenRouter();
