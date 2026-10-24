-- Run AFTER the outbox migration, worker deployment and provider configuration.
-- In Supabase Vault create kasangga_email_worker_url (full Edge function URL)
-- and kasangga_email_worker_secret (same random value as EMAIL_WORKER_SECRET).
-- Never put the actual secrets into a tracked SQL file.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
do $$
begin
  if not exists(select 1 from vault.decrypted_secrets where name='kasangga_email_worker_url')
     or not exists(select 1 from vault.decrypted_secrets where name='kasangga_email_worker_secret') then
    raise exception 'Configure the email worker URL and secret in Supabase Vault first';
  end if;
end $$;
select cron.schedule('kasangga-transactional-emails','* * * * *', $job$
  select net.http_post(
    url:=(select decrypted_secret from vault.decrypted_secrets where name='kasangga_email_worker_url' limit 1),
    headers:=jsonb_build_object('Content-Type','application/json','x-email-worker-secret',
      (select decrypted_secret from vault.decrypted_secrets where name='kasangga_email_worker_secret' limit 1)),
    body:='{}'::jsonb,
    timeout_milliseconds:=120000
  );
$job$);
