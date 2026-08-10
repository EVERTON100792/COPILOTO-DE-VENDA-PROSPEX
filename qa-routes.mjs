export default async function run(page, ui) {
  const out = { routes: {} }
  const routes = [
    ['/', 'VISÃO GERAL'],
    ['/campaigns', 'Campanhas'],
    ['/campaigns/new', 'Nova campanha'],
    ['/leads', 'Todos'],
    ['/kanban', 'Kanban'],
    ['/messages', 'Mensagens'],
    ['/followups', 'Follow-ups'],
    ['/companies', 'Empresas'],
    ['/proposals', 'Propostas'],
    ['/agents', 'AGENTES'],
    ['/automations', 'Automações'],
    ['/integrations', 'Integrações'],
    ['/reports', 'Relatórios'],
    ['/settings', 'Configurações'],
  ]
  for (const [path, needle] of routes) {
    await page.goto('http://localhost:4173' + path)
    await page.waitForTimeout(900)
    const t = await page.title()
    const has = await page.evaluate((nd) => document.body.innerText.includes(nd), needle)
    out.routes[path] = { title: t, needleFound: has }
    const logs = await page.evaluate(() => {
      try {
        return JSON.parse(localStorage.getItem('prospex_logs') || '[]').filter((l) => l.level === 'error').length
      } catch { return -1 }
    })
    out.routes[path].errorLogs = logs
  }
  return out
}