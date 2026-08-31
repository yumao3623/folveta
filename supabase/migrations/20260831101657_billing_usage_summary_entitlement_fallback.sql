-- A paid entitlement can exist before the first successful generation creates
-- a usage-period row. Always derive the displayed plan and limit from the
-- current environment-specific subscription; usage rows only track counts.
create or replace function public.billing_usage_summary(
  p_user_id uuid,
  p_billing_environment text
)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'plan', entitlement.plan,
    'quota', entitlement.quota,
    'consumed', coalesce(period.consumed, 0),
    'reserved', coalesce(period.reserved, 0),
    'remaining', greatest(0, entitlement.quota - coalesce(period.consumed, 0) - coalesce(period.reserved, 0)),
    'periodStart', coalesce(period.period_start, public.billing_period_start()),
    'periodEnd', coalesce(period.period_end, (public.billing_period_start() + interval '1 month')::date),
    'subscriptionStatus', (
      select status from public.billing_subscriptions
      where user_id = p_user_id
        and billing_environment = p_billing_environment
        and status in ('active', 'trialing', 'past_due', 'paused', 'canceled', 'completed')
      order by updated_at desc limit 1
    )
  )
  from public.billing_quota_for_user(p_user_id, p_billing_environment) entitlement
  left join public.billing_usage_periods period
    on period.user_id = p_user_id
   and period.billing_environment = p_billing_environment
   and period.period_start = public.billing_period_start()
  where p_billing_environment in ('sandbox', 'live');
$$;
