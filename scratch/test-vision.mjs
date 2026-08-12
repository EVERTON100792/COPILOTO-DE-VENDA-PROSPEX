import fs from 'fs'

async function run() {
  const apiKey = 'sk-Ij7Pnh4rZAO5LowBUVQuQxMCDD6dRotijpprSQ189yJkGtaBGqgqmuqgjwPw7D2L'
  const endpoints = ['https://opencode.ai/zen/go/v1/chat/completions', 'https://opencode.ai/zen/v1/chat/completions']
  const imageBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="

  const models = ['deepseek-v4-pro', 'gpt-4o-mini', 'gpt-4o', 'gemini-1.5-flash', 'minimax-m2.5-free', 'gpt-5-nano']
  
  for (const endpoint of endpoints) {
    console.log(`\nTesting endpoint: ${endpoint}`)
    for (const model of models) {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "What is this?" },
                { type: "image_url", image_url: { url: imageBase64 } }
              ]
            }
          ]
        })
      })

      const text = await res.text()
      if (res.status === 200) {
        console.log(`Model ${model} SUCCESS!`)
      } else {
        console.log(`Model ${model} ERROR ${res.status}:`, text.slice(0, 100))
      }
    }
  }
}

run()
