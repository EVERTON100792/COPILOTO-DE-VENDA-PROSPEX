export default async function run(page, ui) {
  const out = { consoleErrs: [] }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      if (text.length < 3000) out.consoleErrs.push(text)
    }
  })
  page.on('pageerror', (err) => { out.pageError = String(err).slice(0, 3000) })

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

  const city = (await ui.snapshot()).match(/@(e\d+) textbox "Digite uma cidade"/)
  if (city) await ui.fill(`@${city[1]}`, 'Londrina')
  await sleep(300)
  for (let i = 0; i < 5; i++) if (!(await continueBtn())) break

  await sleep(900)
  const rev = await ui.snapshot()
  const nameBox = rev.match(/@(e\d+) textbox "Ex.: Dentistas Londrina"/)
  if (nameBox) {
    await ui.fill(`@${nameBox[1]}`, 'QA Dev 2')
    await sleep(400)
    const s3 = await ui.snapshot()
    const start = s3.match(/@(e\d+) button "▶ Iniciar prospecção"/)
    if (start) await ui.click(`@${start[1]}`)
  }
  await page.waitForTimeout(3500)

  await page.reload()
  await page.waitForTimeout(2000)

  return out
}