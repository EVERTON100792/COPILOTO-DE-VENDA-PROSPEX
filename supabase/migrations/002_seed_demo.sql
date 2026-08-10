-- ============================================================
-- PROSPEX AUTOPILOT — Seed demo (opcional)
-- Cria um workspace demo + usuário + configuração inicial.
-- O front roda em DEMO_MODE (localStorage) por padrão; este seed
-- só é necessário ao habilitar a persistência em Supabase.
-- ============================================================

insert into public.workspaces (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Workspace Demo');

-- Substitua o id do auth.users criado no painel do Supabase:
-- insert into public.app_users (id, workspace_id, name, email, role) values
--   ('<auth-user-uuid>', '00000000-0000-0000-0000-000000000001', 'Demo Owner', 'demo@exemplo.com', 'OWNER');

insert into public.settings (workspace_id, demo_mode, master_switch, score_weights) values
  ('00000000-0000-0000-0000-000000000001', true, 'ON', '{
    "noWebsite": 30, "poorWebsite": 20, "greatWebsite": 0,
    "manyReviews": 15, "goodRating": 10, "instagramActive": 10,
    "facebookActive": 5, "hasWhatsapp": 10, "hasPhone": 5,
    "activeBusiness": 10, "incompleteData": -10
  }'::jsonb);