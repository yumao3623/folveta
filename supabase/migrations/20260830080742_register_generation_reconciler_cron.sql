-- Register the minute reconciliation trigger after Vault secrets are present.
-- The job body contains no secret; private.invoke_generation_reconciler reads
-- both values from Vault at execution time.

select cron.unschedule(jobid)
from cron.job
where jobname = 'generation-reconcile';

select cron.schedule(
  'generation-reconcile',
  '* * * * *',
  $$select private.invoke_generation_reconciler();$$
);
