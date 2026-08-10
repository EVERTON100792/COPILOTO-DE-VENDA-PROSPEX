export default async function run(page, ui) {
  const out = {}
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  const continueBtn = async () => {
    const s = await ui.snapshot()
    const m = s.match(/@(e\d+) button "Continuar →"/)
    if (!m) return false
    await ui.click(`@${m[1]}`)
    await sleep(400)
    return true
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    const cam = 'QA Loop ' + attempt
    const nic = (await ui.snapshot()).match(/@(e\d+) button "🦷 Odontologia[^"]*"/)
    if (nic) await ui.click(`@${nic[1]}`)
    await sleep(400)
    await continueBtn()
    const city = (await ui.snapshot()).match(/@(e\d+) textbox "Digite uma cidade"/)
    if (city) await ui.fill(`@${city[1]}`, 'Londrina')
    await sleep(300)
    for (let i = 0; i < 5; i++) if (!(await continueBtn())) break
    await sleep(800)
    const rev = await ui.snapshot()
    const nameBox = rev.match(/@(e\d+) textbox "Ex.: Dentistas Londrina"/)
    if (nameBox) {
      await ui.fill(`@${nameBox[1]}`, cam)
      await sleep(300)
      const s3 = await ui.snapshot()
      const start = s3.match(/@(e\d+) button "▶ Iniciar prospecção"/)
      if (start) await ui.click(`@${start[1]}`)
    }
    await page.waitForTimeout(2500)
    await page.reload()
    await page.waitForTimeout(1500)
  }

  const logs = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('prospex_logs') || '[]')
        .filter((l) => l.level === 'error').slice(-6)
        .map((l) => l.detail)
    } catch { return [] }
  })
  out.lastErrors = logs
  return out
}