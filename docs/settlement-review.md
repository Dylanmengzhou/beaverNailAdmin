# Project commission and settlement review

Employees enter a final price and submit a settlement request. The server uses the project's private commission rate, snapshots the calculation, and leaves the reservation's official financial fields unchanged until a store manager or administrator approves it. Managers can also enter and confirm a settlement directly. Rejections require a reason; employees can withdraw their own pending requests.

Configure dated tiers in **项目与价格 → 项目 → 提成规则**. Each rule records its inclusive service start date, currency, project default or employee override, and tier thresholds. Percentages entered here are the shop's share; the employee receives the complement. Published rules are append-only. Each submitted order snapshots its applicable rule; publishing another rule never rewrites existing orders or requests.

Revenue accumulates per employee, project, calendar month of service in Korea, and currency. Only approved final prices (including pre-existing historical official amounts) count. At a threshold, the **whole month** uses the attained tier. Each order still selects that tier from its own historical policy snapshot. A mid-month rule change therefore retains both old and new date rules. Approval, correction, currency change, and cancellation recalculate the affected month atomically and record before/after calculations. Shared monthly locks serialize both admin and customer cancellation paths.

An unset rule blocks new submissions. A one-tier rule supports a fixed percentage; 0% or 100% shop share is valid. Corrections preserve official prices until approval. Legacy orders without a recoverable rule snapshot keep their original commission. Employees can see the effective-date timeline in **经营统计 → 提成规则**, and their order details and performance show each order's rule date.

Set **员工与排班 → 管理权限 → 店长** to grant the same management and review access as the administrator. Job grade is separate. APIs resolve current database permissions on each request, including for existing tokens. Employees can only submit and view settlement requests for their own orders.

## Deployment

Before deploying the new server, apply the additive migration using the intended environment:

```sh
npx tsx --env-file=/absolute/path/to/intended.env scripts/apply-settlement-review.ts --apply
```

Then run the same command with `--tiers` to apply `20261115_commission_tiers.sql`. Deploy the compatible customer cancellation backend as well as the admin server. The customer Prisma schema and mini-app response shapes remain unchanged.

The runner uses a transaction, advisory lock, and migration ledger; reruns are safe. It adds tables and columns without rewriting existing prices, balances, employee roles, or schedules. Never run `prisma db push` against production to apply this change.

The customer website and mini program 4.0.1 keep using their existing booking and content contracts. No mini program release is required. Existing `receivedAmount` and employee-wide rate columns remain for historical compatibility; new settlements do not use them. The legacy admin price endpoint now creates a pending request and cannot bypass approval. The existing mini-app cancellation endpoint performs the same monthly recalculation entirely on the server.

## Verification

Run integration tests only with an isolated local PostgreSQL database and local admin/customer origins. Tests cover project-specific rates, approval and correction workflows, current permissions, duplicate/concurrent requests, audit history, membership balances, and the unchanged customer backend.

```sh
npx tsx --env-file=.env.local --test --test-concurrency=1 tests/*.test.ts
npm run build
```
