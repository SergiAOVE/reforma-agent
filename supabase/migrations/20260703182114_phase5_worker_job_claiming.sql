-- Migration: Phase 5 worker job claiming
--
-- The worker runs with the Supabase service role key and claims work through
-- this RPC. Browser clients never receive the service role key and cannot call
-- this function.

-- An audio evidence item has one canonical transcription. This makes worker
-- retries idempotent if a process crashes after inserting the transcript but
-- before marking the job as completed.
create unique index audio_transcriptions_evidence_unique_idx
  on public.audio_transcriptions (evidence_id);

-- Atomically claim the next pending or stale processing job using row locks.
-- `FOR UPDATE SKIP LOCKED` lets multiple worker processes poll concurrently
-- without double-processing the same job.
create function public.claim_agent_job(
  p_worker_id text,
  p_allowed_types public.job_type[] default null,
  p_stale_after_seconds integer default 600
)
returns public.agent_jobs
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_job public.agent_jobs;
begin
  update public.agent_jobs
  set
    status = 'processing',
    locked_at = now(),
    locked_by = p_worker_id,
    attempt_count = attempt_count + 1,
    error_message = null,
    updated_at = now()
  where id = (
    select id
    from public.agent_jobs
    where
      (p_allowed_types is null or type = any(p_allowed_types))
      and attempt_count < max_attempts
      and (
        status = 'pending'
        or (
          status = 'processing'
          and locked_at < now() - make_interval(secs => greatest(p_stale_after_seconds, 1))
        )
      )
    order by created_at asc
    for update skip locked
    limit 1
  )
  returning * into v_job;

  return v_job;
end;
$$;

revoke execute on function public.claim_agent_job(text, public.job_type[], integer)
  from public, anon, authenticated;
grant execute on function public.claim_agent_job(text, public.job_type[], integer)
  to service_role;
