import fs from 'fs'

const TAVILY_API_KEY = "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"

async function testTavily() {
  const url = "https://www.google.com/maps/place/Pizzaria+Bate+Papo/@-23.5489,-46.6388,15z"

  try {
    const res = await fetch("https://api.tavily.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        urls: [url]
      })
    });
    
    if (res.ok) {
      const data = await res.json();
      fs.writeFileSync('tavily-extract.json', JSON.stringify(data, null, 2))
      console.log('Success')
    } else {
      console.log('Error', res.status, await res.text())
    }
  } catch(e) {
    console.error(e)
  }
}

testTavily()
