import fs from 'fs'

async function testAllOrigins() {
  const url = "https://maps.app.goo.gl/3Q8Y" // Assuming a short URL or long URL
  // Actually, wait, short URLs redirect, so allOrigins might follow redirects. Let's try.
  const queryUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`

  try {
    const res = await fetch(queryUrl);
    
    if (res.ok) {
      const data = await res.json();
      fs.writeFileSync('allorigins-test.html', data.contents)
      console.log('Success')
    } else {
      console.log('Error', res.status, await res.text())
    }
  } catch(e) {
    console.error(e)
  }
}

testAllOrigins()
