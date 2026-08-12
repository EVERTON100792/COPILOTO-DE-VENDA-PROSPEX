const fs = require('fs')
const path = require('path')

const storePath = path.join(__dirname, 'src/services/store.ts')
let code = fs.readFileSync(storePath, 'utf-8')

// Inject imports
if (!code.includes("import { supabase }")) {
  code = code.replace(
    "import { DEFAULT_SETTINGS } from '../config/defaults'",
    "import { DEFAULT_SETTINGS } from '../config/defaults'\nimport { supabase } from '../lib/supabase'"
  )
}

// Inject hydrate fetch
const hydrateInject = `
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      const { data: user } = await supabase.from('app_users').select('workspace_id').eq('id', session.user.id).single()
      if (user) {
        set({ workspaceId: user.workspace_id })
        const { data: dbComps } = await supabase.from('companies').select('*').eq('workspace_id', user.workspace_id)
        if (dbComps && dbComps.length > 0) {
           set({ companies: dbComps })
        }
        const { data: dbLeads } = await supabase.from('leads').select('*').eq('workspace_id', user.workspace_id)
        if (dbLeads && dbLeads.length > 0) {
           set({ leads: dbLeads })
        }
      }
    }
`

if (!code.includes("supabase.auth.getSession()")) {
  code = code.replace("hydrate: () => {", "hydrate: async () => {\n" + hydrateInject)
}

// Helper to inject upsert
code = code.replace(
  /upsertCompany: \(company\) => \{([\s\S]*?)persist\(\{ companies: next \}\)/g,
  `upsertCompany: (company) => {
    company.workspaceId = get().workspaceId; // Força vincular ao workspace
    $1persist({ companies: next });
    supabase.from('companies').upsert(company).then(({error}) => { if (error) console.error(error) });`
)

code = code.replace(
  /upsertLead: \(lead\) => \{([\s\S]*?)persist\(\{ leads: next \}\)/g,
  `upsertLead: (lead) => {
    lead.workspaceId = get().workspaceId;
    $1persist({ leads: next });
    supabase.from('leads').upsert(lead).then(({error}) => { if (error) console.error(error) });`
)

fs.writeFileSync(storePath, code)
console.log("store.ts patched with Supabase sync")
