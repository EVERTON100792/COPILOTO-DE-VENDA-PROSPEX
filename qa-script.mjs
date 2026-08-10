export default async function run(page, ui) {
  const out = {}
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  const continueBtn = async () => {
    const s = await ui.snapshot()
    const m = s.match(/@(e\d+) button "Continuar →"/)
    if (!m) return false
    await ui.click(`@${m[1]}`)
    await sleep(500)
    return true
  }

  const nic = (await ui.snapshot()).match(/@(e\d+) button "🦷 Odontologia[^"]*"/)
  if (nic) await ui.click(`@${nic[1]}`)
  await sleep(400)
  await continueBtn()

  const s2 = await ui.snapshot()
  const city = s2.match(/@(e\d+) textbox "Digite uma cidade"/)
  if (city) await ui.fill(`@${city[1]}`, 'Londrina')
  await sleep(300)
  for (let i = 0; i < 5; i++) {
    if (!(await continueBtn())) break
  }

  await sleep(900)
  const rev = await ui.snapshot()
  const nameBox = rev.match(/@(e\d+) textbox "Ex.: Dentistas Londrina"/)
  if (nameBox) {
    await ui.fill(`@${nameBox[1]}`, 'QA Dentistas Londrina')
    await sleep(400)
    const s3 = await ui.snapshot()
    const start = s3.match(/@(e\d+) button "▶ Iniciar prospecção"/)
    if (start) {
      await ui.click(`@${start[1]}`)
      out.started = true
      await page.waitForTimeout(2500)
      await page.waitForFunction(() => /\/campaigns\/[\w-]+/.test(location.pathname), { timeout: 60000 }).catch(() => {})
      await page.waitForTimeout(2500)
      out.finalUrl = page.url()
      out.done = /\/campaigns\/[\w-]+/.test(out.finalUrl)
      const body = await page.evaluate(() => document.body.innerText)
      out.hasProgress = body.includes('%') 
      out.bodyPeek = body.slice(0, 900)
    } else {
      out.noStart = s3.split('\n').filter((l) => l.includes('button')).slice(-5)
    }
  } else {
    out.noNameBox = true
  }

  return out
}