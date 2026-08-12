-- ============================================================
-- PROSPEX AUTOPILOT — Gatilho de Autenticação (Fase 6)
-- Cria automaticamente workspace e usuário ao registrar via Supabase Auth
-- ============================================================

-- Função para lidar com a criação de novos usuários no Auth
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  new_workspace_id uuid;
begin
  -- 1. Criar um workspace padrão para o usuário
  insert into public.workspaces (name)
  values (coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)) || ' Workspace')
  returning id into new_workspace_id;

  -- 2. Criar o perfil de usuário vinculado ao workspace
  insert into public.app_users (id, workspace_id, name, email, role)
  values (
    new.id,
    new_workspace_id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    'OWNER'
  );

  return new;
end $$;

-- Gatilho que é acionado após inserção na tabela auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
