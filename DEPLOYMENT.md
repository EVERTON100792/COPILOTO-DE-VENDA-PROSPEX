# Deploy — PROSPEX AUTOPILOT

## Build de produção

```bash
npm ci
npm run build   # tsc -b && vite build → dist/
```

Artefato estático: `dist/`. Servir com qualquer host estático
(Nginx, Netlify, Vercel, Cloudflare Pages, S3+CDN).

> O app usa History Mode do react-router → o servidor deve reescrever
> rotas não-encontradas para `index.html` (SPA fallback).

## Vercel

`vercel.json` com reescrita SPA:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Envs no painel: `VITE_DEMO_MODE`, `VITE_AI_*`, `VITE_SEARCH_*`,
`VITE_MAPS_API_KEY`, `VITE_EMAIL_*`, `VITE_WHATSAPP_*`, `VITE_SUPABASE_*`.

## Nginx (exemplo)

```nginx
location / {
  try_files $uri $uri/ /index.html;
}
```

## Variáveis de ambiente (.env.local)

Copiar de `.env.example`. Todas opcionais — sem elas o app roda em demo.

| Var | Uso |
|---|---|
| `VITE_DEMO_MODE` | `true` = modo demo (padrão) |
| `VITE_AI_PROVIDER/API_KEY/MODEL/BASE_URL` | IA (openrouter/openai/anthropic) |
| `VITE_SEARCH_PROVIDER/API_KEY` | Busca de empresas |
| `VITE_MAPS_API_KEY` | Google Maps |
| `VITE_EMAIL_PROVIDER/API_KEY` | E-mail |
| `VITE_WHATSAPP_PROVIDER/API_KEY/PHONE_ID` | WhatsApp |
| `VITE_SUPABASE_URL/ANON_KEY` | Persistência (capacidade) |

## Checklist pré-deploy

1. `npm run build` limpo e `npm run test` com 22 testes verdes.
2. Demo e caminho real de envio testados (Messages aprovação → simulado).
3. Integrações em `/integrations` mostram estado correto.
4. SPA fallback configurado no host.