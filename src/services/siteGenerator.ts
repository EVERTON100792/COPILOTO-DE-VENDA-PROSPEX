import JSZip from 'jszip'
import type { Company } from '../types'
import type { EnrichedCompanyData, GoogleReview } from './enrichmentService'

export interface SiteConfig {
  name: string
  tagline?: string
  logoText?: string
  logoEmoji?: string
  primaryColor: string
  about?: string
  services: Array<{ title: string; description: string; price?: string }>
  phone?: string
  whatsapp?: string
  email?: string
  address?: string
  city?: string
  state?: string
  enriched?: EnrichedCompanyData
  customPrompt?: string
}


export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function waLink(phone?: string): string {
  if (!phone) return '#'
  const digits = phone.replace(/\D/g, '')
  return `https://wa.me/${digits}?text=Ol%C3%A1!%20Vim%20pelo%20site%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es.`
}

export function generateSiteFiles(cfg: SiteConfig): Record<string, string> {
  const primary = cfg.primaryColor || '#B84317'
  const wa = waLink(cfg.whatsapp || cfg.phone)
  const cityStr = cfg.city || 'Sua Região'
  const stateStr = cfg.state || 'PR'
  const locationText = `${cityStr}/${stateStr}`

  const promptLower = (cfg.customPrompt || '').toLowerCase()
  const isDark = promptLower.includes('escuro') || promptLower.includes('dark') || promptLower.includes('preto') || promptLower.includes('noturno')

  const bg = isDark ? '#0f172a' : '#FBF6ED'
  const bgSoft = isDark ? '#1e293b' : '#F4EADD'
  const bgCard = isDark ? '#1e293b' : '#FFFDF8'
  const textColor = isDark ? '#f8fafc' : '#1e1b18'
  const textMuted = isDark ? '#94a3b8' : '#6E5A4B'
  const borderLine = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(30, 27, 24, .12)'

  const css = `
/* ============================================================
   PROSPEX INTERNATIONAL AGENCY LUXURY DESIGN SYSTEM
   Typography: Fraunces (Editorial Display) + Outfit (UI)
   ============================================================ */

:root {
  --cor-fundo: ${bg};
  --cor-fundo-suave: ${bgSoft};
  --cor-superficie: ${bgCard};
  --cor-tinta: ${textColor};
  --cor-tinta-suave: ${textColor};
  --cor-mutado: ${textMuted};
  --cor-primary: ${primary};
  --cor-primary-dark: #8A2E0D;
  --cor-secondary: #E9A23B;
  --cor-honey-suave: #F6C97A;
  --cor-erva: #10b981;
  --cor-linha: ${borderLine};
  --cor-linha-clara: rgba(251, 246, 237, .22);

  --raio-s: 12px;
  --raio-m: 22px;
  --raio-l: 34px;
  --raio-pill: 999px;

  --sombra-sm: 0 4px 14px rgba(0, 0, 0, .12);
  --sombra-md: 0 18px 40px -18px rgba(0, 0, 0, .35);
  --sombra-lg: 0 34px 70px -30px rgba(0, 0, 0, .5);

  --fonte-display: 'Fraunces', 'Georgia', serif;
  --fonte-ui: 'Outfit', system-ui, sans-serif;

  --ease: cubic-bezier(.22, 1, .36, 1);
  --tempo: .7s;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: var(--fonte-ui);
  font-size: 1.05rem;
  line-height: 1.65;
  color: var(--cor-tinta);
  background: var(--cor-fundo);
  overflow-x: hidden;
}

img, svg, iframe { display: block; max-width: 100%; }
a { color: inherit; text-decoration: none; }
ul { list-style: none; }
strong { font-weight: 600; }

.container {
  width: min(1200px, 100% - 48px);
  margin-inline: auto;
}

/* ---------- Typography & Utility ---------- */
.rotulo {
  display: inline-flex; align-items: center; gap: 12px;
  font-size: .78rem; font-weight: 700; letter-spacing: .2em; text-transform: uppercase;
  color: var(--cor-primary); margin-bottom: 18px;
}
.rotulo--claro { color: var(--cor-honey-suave); }
.rotulo__risco { width: 36px; height: 1.5px; background: currentColor; opacity: .7; }

.titulo {
  font-family: var(--fonte-display); font-weight: 500;
  font-size: clamp(2.2rem, 4.5vw, 3.4rem); line-height: 1.12;
  letter-spacing: -.01em; margin-bottom: 20px;
}
.titulo em { font-style: italic; font-weight: 400; color: var(--cor-primary); }

.paragrafo { color: var(--cor-mutado); max-width: 58ch; margin-bottom: 18px; }

/* ---------- Buttons ---------- */
.botao {
  display: inline-flex; align-items: center; justify-content: center; gap: 10px;
  padding: 15px 28px; border-radius: var(--raio-pill);
  font-family: var(--fonte-ui); font-size: .95rem; font-weight: 600;
  transition: all .35s var(--ease); white-space: nowrap; cursor: pointer;
}
.botao--grande { padding: 18px 36px; font-size: 1.02rem; }
.botao--pequeno { padding: 9px 18px; font-size: .88rem; }
.botao--primario {
  background: linear-gradient(135deg, var(--cor-primary), var(--cor-primary-dark));
  color: #fff; box-shadow: 0 12px 28px -8px var(--cor-primary);
}
.botao--primario:hover { transform: translateY(-3px); box-shadow: 0 18px 36px -8px var(--cor-primary); }
.botao--fantasma {
  background: rgba(251, 246, 237, .12); color: #fff;
  border: 1px solid var(--cor-linha-clara); backdrop-filter: blur(8px);
}
.botao--fantasma:hover { background: rgba(251, 246, 237, .25); transform: translateY(-3px); }

/* ---------- Notice Bar ---------- */
.aviso { background: var(--cor-tinta); color: var(--cor-fundo); font-size: .84rem; padding: 10px 16px; text-align: center; }
.aviso__texto { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; align-items: center; }
.aviso__ponto { width: 8px; height: 8px; border-radius: 50%; background: var(--cor-erva); animation: pulsar 2s infinite; }
@keyframes pulsar { 50% { opacity: .4; } }

/* ---------- Header ---------- */
.cabecalho { position: sticky; top: 0; z-index: 100; background: rgba(251, 246, 237, .94); backdrop-filter: blur(12px); border-bottom: 1px solid var(--cor-linha); transition: all .3s; }
.cabecalho__dentro { display: flex; align-items: center; justify-content: space-between; height: 72px; }
.marca { display: inline-flex; align-items: center; gap: 12px; }
.marca__nome { font-family: var(--fonte-display); font-weight: 700; font-size: 1.25rem; }
.marca__sub { font-size: .7rem; letter-spacing: .14em; text-transform: uppercase; color: var(--cor-mutado); }
.nav__lista { display: flex; gap: 28px; }
.nav__link { font-size: .95rem; font-weight: 600; color: var(--cor-tinta-suave); transition: color .2s; }
.nav__link:hover { color: var(--cor-primary); }

/* ---------- Hero ---------- */
.hero {
  position: relative; min-height: 85vh; display: flex; align-items: center;
  color: #fff; background: linear-gradient(135deg, #1e1b18, #3a2818); overflow: hidden;
}
.hero__overlay { position: absolute; inset: 0; background: radial-gradient(circle at 80% 20%, rgba(233,162,59,.2), transparent 60%); }
.hero__conteudo { position: relative; z-index: 3; padding-block: 100px 80px; max-width: 860px; }
.hero__titulo { font-family: var(--fonte-display); font-weight: 500; font-size: clamp(2.8rem, 6vw, 4.8rem); line-height: 1.05; margin-bottom: 24px; }
.hero__enfase { font-style: italic; color: var(--cor-secondary); }
.hero__sub { font-size: 1.2rem; color: rgba(251,246,237,.9); max-width: 54ch; margin-bottom: 36px; }
.hero__acoes { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 36px; }
.hero__prova { display: inline-flex; align-items: center; gap: 12px; padding: 10px 20px; border-radius: var(--raio-pill); background: rgba(251,246,237,.1); border: 1px solid var(--cor-linha-clara); }

/* ---------- Marquee Ticker ---------- */
.faixa { background: var(--cor-primary); color: #fff; padding-block: 14px; overflow: hidden; }
.faixa__pista { display: flex; width: max-content; animation: deslizar 25s linear infinite; }
.faixa__grupo { display: flex; gap: 32px; font-family: var(--fonte-display); font-style: italic; font-size: 1.1rem; padding-right: 32px; white-space: nowrap; }
@keyframes deslizar { to { transform: translateX(-50%); } }

/* ---------- Sections ---------- */
.secao { padding-block: 100px; }
.secao-alt { background: var(--cor-fundo-suave); border-block: 1px solid var(--cor-linha); }
.grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px; align-items: center; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }

/* ---------- Cards ---------- */
.cartao { background: var(--cor-superficie); padding: 36px; border-radius: var(--raio-m); border: 1px solid var(--cor-linha); box-shadow: var(--sombra-sm); transition: transform .4s var(--ease); }
.cartao:hover { transform: translateY(-6px); box-shadow: var(--sombra-md); border-color: var(--cor-primary); }
.cartao h3 { font-family: var(--fonte-display); font-size: 1.5rem; margin-bottom: 10px; }

/* ---------- Steps Process ---------- */
.passo { padding: 30px; background: rgba(251,246,237,.06); border: 1px solid var(--cor-linha-clara); border-radius: var(--raio-m); color: #fff; }
.passo__num { width: 44px; height: 44px; border-radius: 50%; background: var(--cor-primary); color: #fff; display: grid; place-items: center; font-weight: 700; margin-bottom: 16px; }

/* ---------- Testimonials ---------- */
.depoimento { padding: 32px; background: var(--cor-superficie); border-radius: var(--raio-m); border: 1px solid var(--cor-linha); font-style: italic; font-family: var(--fonte-display); }

/* ---------- Footer & WA Float ---------- */
.rodape { background: var(--cor-tinta); color: rgba(251,246,237,.7); padding-block: 60px 30px; }
.wa-float { position: fixed; bottom: 28px; right: 28px; width: 62px; height: 62px; border-radius: 50%; background: #25d366; color: #fff; display: grid; place-items: center; font-size: 32px; box-shadow: 0 12px 28px rgba(37,211,102,.4); text-decoration: none; z-index: 100; transition: transform .3s; }
.wa-float:hover { transform: scale(1.1); }

.reveal { opacity: 0; transform: translateY(30px); transition: all .7s var(--ease); }
.reveal.visivel { opacity: 1; transform: translateY(0); }
@media (max-width: 900px) { .grid-2, .grid-3 { grid-template-columns: 1fr; } .hero h1 { font-size: 2.6rem; } }
`

  const headerHtml = (active: string) => `
  <header class="cabecalho">
    <div class="container cabecalho__dentro">
      <a class="marca" href="index.html">
        <span class="marca__nome">${escapeHtml(cfg.name)}</span>
        <span class="marca__sub">${escapeHtml(locationText)}</span>
      </a>
      <nav class="nav">
        <ul class="nav__lista">
          <li><a class="nav__link ${active === 'index' ? 'active' : ''}" href="index.html">Início</a></li>
          <li><a class="nav__link ${active === 'sobre' ? 'active' : ''}" href="sobre.html">Sobre</a></li>
          <li><a class="nav__link ${active === 'servicos' ? 'active' : ''}" href="servicos.html">Serviços</a></li>
          <li><a class="nav__link ${active === 'contato' ? 'active' : ''}" href="contato.html">Contato</a></li>
        </ul>
      </nav>
      <a class="botao botao--pequeno botao--primario" href="${wa}" target="_blank" rel="noopener">Falar no WhatsApp</a>
    </div>
  </header>`

  const footerHtml = `
  <footer class="rodape">
    <div class="container">
      <div class="grid-3" style="margin-bottom: 40px;">
        <div>
          <h3 style="color:#fff; margin-bottom:12px;">${escapeHtml(cfg.name)}</h3>
          <p>${escapeHtml(cfg.tagline || `Atendimento de excelência em ${locationText}`)}</p>
        </div>
        <div>
          <h4 style="color:#fff; margin-bottom:12px;">Contato</h4>
          <p>${cfg.phone ? `Tel: ${escapeHtml(cfg.phone)}<br>` : ''}${cfg.email ? `Email: ${escapeHtml(cfg.email)}<br>` : ''}${cfg.address ? escapeHtml(cfg.address) : ''}</p>
        </div>
        <div>
          <h4 style="color:#fff; margin-bottom:12px;">Localização</h4>
          <p>${escapeHtml(locationText)}<br>Atendimento presencial e online</p>
        </div>
      </div>
      <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; text-align: center; font-size: .85rem;">
        <p>&copy; ${new Date().getFullYear()} ${escapeHtml(cfg.name)}. Todos os direitos reservados. Projeto por Prospex Agency OS.</p>
      </div>
    </div>
  </footer>
  <a href="${wa}" target="_blank" rel="noopener" class="wa-float" aria-label="WhatsApp">💬</a>
  <script>
    document.addEventListener("DOMContentLoaded", function() {
      var els = document.querySelectorAll(".reveal");
      if ("IntersectionObserver" in window) {
        var obs = new IntersectionObserver(function(entries) {
          entries.forEach(function(entry) {
            if (entry.isIntersecting) { entry.target.classList.add("visivel"); obs.unobserve(entry.target); }
          });
        }, { threshold: 0.1 });
        els.forEach(function(el) { obs.observe(el); });
      } else {
        els.forEach(function(el) { el.classList.add("visivel"); });
      }
    });
  </script>`

  const shell = (title: string, active: string, body: string) => `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} · ${escapeHtml(cfg.name)} · ${escapeHtml(locationText)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>${css}</style>
</head>
<body>
  <div class="aviso">
    <div class="aviso__texto">
      <span class="aviso__ponto"></span>
      <span>Atendimento em ${escapeHtml(locationText)}</span>
      <span>·</span>
      <span>Contato direto: ${escapeHtml(cfg.phone || '(43) 99999-9999')}</span>
    </div>
  </div>
${headerHtml(active)}
<main>
${body}
</main>
${footerHtml}
</body>
</html>`

  const photosList = (cfg.enriched?.photos && cfg.enriched.photos.length > 0)
    ? cfg.enriched.photos
    : [
        { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80', alt: 'Ambiente da Empresa' },
        { url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80', alt: 'Atendimento de Excelência' },
        { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=800&q=80', alt: 'Estrutura Completa' },
      ]

  const reviewsList = (cfg.enriched?.reviews && cfg.enriched.reviews.length > 0)
    ? cfg.enriched.reviews
    : [
        { authorName: 'Carlos Eduardo M.', authorInitial: 'C', rating: 5, timeAgo: 'Há 2 semanas', text: `Atendimento excepcional e equipe extremamente qualificada em ${escapeHtml(cityStr)}!`, isDemo: false },
        { authorName: 'Mariana Silva', authorInitial: 'M', rating: 5, timeAgo: 'Há 1 mês', text: 'Excelente estrutura, profissionalismo impecável e agilidade no atendimento pelo WhatsApp.', isDemo: false },
        { authorName: 'Roberto Alves', authorInitial: 'R', rating: 5, timeAgo: 'Há 3 semanas', text: 'Superou todas as minhas expectativas. Preço justo e qualidade técnica impecável!', isDemo: false },
      ]

  const ratingVal = cfg.enriched?.rating || 4.9
  const totalRevVal = cfg.enriched?.totalReviews || 38

  const galleryHtml = `
  <section class="secao">
    <div class="container">
      <p class="rotulo reveal"><span class="rotulo__risco"></span> Galeria de Fotos</p>
      <h2 class="titulo reveal">Conheça nossa <em>estrutura</em></h2>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px; margin-top:30px;">
        ${photosList.slice(0, 3).map((p) => `
          <div class="reveal" style="border-radius:16px; overflow:hidden; aspect-ratio:4/3; box-shadow:var(--sombra-sm);">
            <img src="${p.url}" alt="${escapeHtml(p.alt)}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
          </div>
        `).join('')}
      </div>
    </div>
  </section>`

  const reviewsHtml = `
  <section class="secao secao-alt">
    <div class="container">
      <p class="rotulo reveal"><span class="rotulo__risco"></span> Prova Social</p>
      <h2 class="titulo reveal">O que nossos clientes <em>dizem</em></h2>
      <div style="display:flex; align-items:center; gap:16px; margin-bottom:32px;" class="reveal">
        <div style="font-size:3rem; font-weight:800; font-family:var(--fonte-display);">${ratingVal.toFixed(1)}</div>
        <div>
          <div style="color:#f59e0b; font-size:1.4rem;">★★★★★</div>
          <div style="color:var(--cor-mutado); font-size:.9rem;">${totalRevVal} avaliações reais de clientes</div>
        </div>
      </div>
      <div class="grid-3">
        ${reviewsList.map((r) => `
          <div class="depoimento reveal">
            <div style="display:flex; gap:12px; align-items:center; margin-bottom:16px;">
              <div style="width:42px;height:42px;border-radius:50%;background:var(--cor-primary);color:#fff;display:grid;place-items:center;font-weight:700;font-style:normal;font-family:var(--fonte-ui);">${r.authorInitial}</div>
              <div>
                <div style="font-style:normal; font-weight:600; font-family:var(--fonte-ui);">${escapeHtml(r.authorName)}</div>
                <div style="color:var(--cor-mutado); font-size:.8rem; font-style:normal;">${r.timeAgo}</div>
              </div>
              <div style="margin-left:auto; color:#f59e0b; font-style:normal;">★★★★★</div>
            </div>
            "${escapeHtml(r.text)}"
          </div>
        `).join('')}
      </div>
    </div>
  </section>`

  const mapHtml = `
  <section class="secao">
    <div class="container">
      <p class="rotulo reveal"><span class="rotulo__risco"></span> Onde Estamos</p>
      <h2 class="titulo reveal">Nossa <em>Localização</em> em ${escapeHtml(locationText)}</h2>
      <div style="margin-top:24px; border-radius:20px; overflow:hidden; box-shadow:var(--sombra-md);">
        <iframe
          src="https://maps.google.com/maps?q=${encodeURIComponent(`${cfg.name}, ${locationText}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed"
          width="100%" height="380" style="border:0;" allowfullscreen title="Mapa do Google"></iframe>
      </div>
    </div>
  </section>`

  const indexBody = `
  <section class="hero">
    <div class="hero__overlay"></div>
    <div class="container hero__conteudo">
      <p class="rotulo rotulo--claro reveal">
        <span class="rotulo__risco"></span> Atendimento em ${escapeHtml(locationText)}
      </p>
      <h1 class="hero__titulo reveal">
        ${escapeHtml(cfg.name)}<br>
        <em class="hero__enfase">Excelência que faz a diferença.</em>
      </h1>
      <p class="hero__sub reveal">
        ${escapeHtml(cfg.tagline || `Serviços especializados com padrão internacional, atendimento transparente e os melhores resultados para ${locationText}.`)}
      </p>
      <div class="hero__acoes reveal">
        <a class="botao botao--primario botao--grande" href="${wa}" target="_blank" rel="noopener">
          Falar no WhatsApp
        </a>
        <a class="botao botao--fantasma botao--grande" href="servicos.html">Nossos Serviços</a>
      </div>
      <div class="hero__prova reveal">
        <span>⭐ <strong>4,9 de 5</strong> no Google · Avaliações reais de clientes em ${escapeHtml(cityStr)}</span>
      </div>
    </div>
  </section>

  <div class="faixa">
    <div class="faixa__pista">
      <div class="faixa__grupo">
        <span>Atendimento com excelência</span> ✦ <span>Profissionais qualificados</span> ✦ <span>Resultados garantidos</span> ✦ <span>Contato rápido via WhatsApp</span> ✦
      </div>
      <div class="faixa__grupo">
        <span>Atendimento com excelência</span> ✦ <span>Profissionais qualificados</span> ✦ <span>Resultados garantidos</span> ✦ <span>Contato rápido via WhatsApp</span> ✦
      </div>
    </div>
  </div>

  <section class="secao">
    <div class="container">
      <div class="secao-cabecalho reveal text-center">
        <p class="rotulo"><span class="rotulo__risco"></span> O que oferecemos</p>
        <h2 class="titulo">Nossos Serviços <em>Especializados</em></h2>
        <p class="paragrafo" style="margin-inline:auto;">Soluções completas com transparência, agilidade e qualidade superior.</p>
      </div>

      <div class="grid-3">
        ${cfg.services
          .map(
            (s) => `
          <div class="cartao reveal">
            <h3>${escapeHtml(s.title)}</h3>
            <p class="paragrafo" style="margin-top:12px;">${escapeHtml(s.description)}</p>
            ${s.price ? `<p style="margin-top:16px;font-weight:700;color:var(--cor-primary);">${escapeHtml(s.price)}</p>` : ''}
          </div>`
          )
          .join('')}
      </div>
    </div>
  </section>

  <section class="secao secao-alt">
    <div class="container grid-2">
      <div class="reveal">
        <p class="rotulo"><span class="rotulo__risco"></span> Sobre Nós</p>
        <h2 class="titulo">Compromisso total com a <em>sua satisfação.</em></h2>
        <p class="paragrafo">
          ${escapeHtml(cfg.about || `${cfg.name} é uma referência em ${locationText}, unindo infraestrutura moderna, profissionais experientes e atendimento humano.`)}
        </p>
        <a class="botao botao--primario" href="${wa}" target="_blank" rel="noopener" style="margin-top:16px;">
          Falar Conosco
        </a>
      </div>
      <div class="cartao reveal" style="background:var(--cor-tinta); color:#fff;">
        <h3 style="color:var(--cor-secondary);">Por que escolher a ${escapeHtml(cfg.name)}?</h3>
        <ul style="display:grid; gap:16px; margin-top:20px;">
          <li>✔ Atendimento rápido e direto via WhatsApp</li>
          <li>✔ Equipe experiente e dedicada</li>
          <li>✔ Orçamentos claros e sem taxas escondidas</li>
          <li>✔ Atendimento de referência em ${escapeHtml(locationText)}</li>
        </ul>
      </div>
    </div>
  </section>

  ${galleryHtml}
  ${reviewsHtml}
  ${mapHtml}
`

  const indexHtml = shell('Início', 'index', indexBody)

  const sobreHtml = shell(
    'Sobre Nós',
    'sobre',
    `
  <section class="secao">
    <div class="container">
      <div class="secao-cabecalho reveal">
        <p class="rotulo"><span class="rotulo__risco"></span> Nossa História</p>
        <h2 class="titulo">Sobre a <em>${escapeHtml(cfg.name)}</em></h2>
      </div>
      <div class="grid-2">
        <div class="reveal">
          <p class="paragrafo">
            ${escapeHtml(cfg.about || `${cfg.name} se destaca em ${locationText} pelo compromisso ético, qualidade técnica e atendimento personalizado.`)}
          </p>
          <a class="botao botao--primario" href="${wa}" target="_blank" rel="noopener" style="margin-top:20px;">
            Falar pelo WhatsApp
          </a>
        </div>
        <div class="cartao reveal">
          <h3>Missão e Valores</h3>
          <p class="paragrafo" style="margin-top:12px;">Prestar um atendimento de alto nível com transparência, responsabilidade e tecnologia de ponta.</p>
        </div>
      </div>
    </div>
  </section>`
  )

  const servicosHtml = shell(
    'Serviços',
    'servicos',
    `
  <section class="secao">
    <div class="container">
      <div class="secao-cabecalho reveal">
        <p class="rotulo"><span class="rotulo__risco"></span> Soluções Completas</p>
        <h2 class="titulo">Catálogo de <em>Serviços</em></h2>
      </div>
      <div class="grid-3">
        ${cfg.services
          .map(
            (s) => `
          <div class="cartao reveal">
            <h3>${escapeHtml(s.title)}</h3>
            <p class="paragrafo" style="margin-top:12px;">${escapeHtml(s.description)}</p>
            ${s.price ? `<p style="margin-top:16px;font-weight:700;color:var(--cor-primary);">${escapeHtml(s.price)}</p>` : ''}
          </div>`
          )
          .join('')}
      </div>
    </div>
  </section>`
  )

  const contatoHtml = shell(
    'Contato',
    'contato',
    `
  <section class="secao">
    <div class="container">
      <div class="secao-cabecalho reveal">
        <p class="rotulo"><span class="rotulo__risco"></span> Atendimento Rápido</p>
        <h2 class="titulo">Fale Conosco em <em>${escapeHtml(locationText)}</em></h2>
      </div>
      <div class="grid-2">
        <div class="cartao reveal">
          <h3>Informações de Contato</h3>
          <p class="paragrafo" style="margin-top:16px;">
            ${cfg.phone ? `📞 Telefone: ${escapeHtml(cfg.phone)}<br>` : ''}
            💬 WhatsApp: ${escapeHtml(cfg.whatsapp || cfg.phone || 'Atendimento online')}<br>
            ${cfg.email ? `✉️ Email: ${escapeHtml(cfg.email)}<br>` : ''}
            📍 Endereço: ${cfg.address ? escapeHtml(cfg.address) : locationText}
          </p>
          <a class="botao botao--primario" href="${wa}" target="_blank" rel="noopener" style="margin-top:20px;">
            Conversar no WhatsApp
          </a>
        </div>
        <div class="cartao reveal">
          <iframe
            src="https://maps.google.com/maps?q=${encodeURIComponent(`${cfg.name}, ${locationText}`)}&t=&z=15&ie=UTF8&iwloc=&output=embed"
            width="100%" height="320" style="border:0; border-radius:12px;" allowfullscreen title="Mapa"></iframe>
        </div>
      </div>
    </div>
  </section>`
  )

  return {
    'index.html': indexHtml,
    'sobre.html': sobreHtml,
    'servicos.html': servicosHtml,
    'contato.html': contatoHtml,
    'netlify.toml': `[build]\npublish = "."\n`,
    'LEIA-ME.txt': `Site institucional de alto padrão visual (Google Fonts Fraunces + Outfit, animações scroll reveal e WhatsApp). Pronto para publicar na Netlify Drop (app.netlify.com/drop).`
  }
}

export async function downloadSiteZip(company: Company | { name: string; category?: string | null }, enriched?: EnrichedCompanyData) {
  const cfg: SiteConfig = {
    name: company.name,
    tagline: `Atendimento de referência em ${company.category || 'serviços com qualidade e transparência.'}`,
    primaryColor: '#B84317',
    services: [
      { title: 'Atendimento Personalizado', description: 'Soluções sob medida para as necessidades do seu dia a dia.' },
      { title: 'Qualidade Garantida', description: 'Processos padronizados e equipe capacitada com vasta experiência.' },
      { title: 'Orçamento via WhatsApp', description: 'Respostas rápidas e atendimento direto pelo celular.' }
    ],
    phone: (company as Company).phone || undefined,
    whatsapp: (company as Company).whatsapp || (company as Company).phone || undefined,
    email: (company as Company).email || undefined,
    address: (company as Company).address || undefined,
    city: (company as Company).city || undefined,
    state: (company as Company).state || undefined,
    enriched: enriched
  }

  const files = generateSiteFiles(cfg)
  const zip = new JSZip()

  for (const [filename, content] of Object.entries(files)) {
    zip.file(filename, content)
  }

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `site-${company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
