# Project commission and settlement review

Employees enter a final price and submit a settlement request. The server uses the project's private commission rate, snapshots the calculation, and leaves the reservation's official financial fields unchanged until a store manager or administrator approves it. Managers can also enter and confirm a settlement directly. Rejections require a reason; employees can withdraw their own pending requests.

Configure rates in **项目与价格 → 项目 → 员工提成比例**. An unset rate blocks new submissions; an explicit 0% is valid. Rate changes affect new requests. Corrections to an approved order preserve its official values until approval. Historical amounts and commission snapshots remain unchanged and are labeled **历史已录入**.

Set **员工与排班 → 管理权限 → 店长** to grant the same management and review access as the administrator. Job grade is separate. APIs resolve current database permissions on each request, including for existing tokens. Employees can only submit and view settlement requests for their own orders.

## Deployment

Before deploying the new server, apply the additive migration using the intended environment:

```sh
npx tsx --env-file=/absolute/path/to/intended.env scripts/apply-settlement-review.ts --apply
```

The runner uses a transaction, advisory lock, and migration ledger; reruns are safe. It adds tables and columns without rewriting existing prices, balances, employee roles, or schedules. Never run `prisma db push` against production to apply this change.

The customer website and mini program 4.0.1 keep using their existing booking and content contracts. No mini program release is required. Existing `receivedAmount` and employee-wide rate columns remain for historical compatibility; new settlements do not use them. The legacy admin price endpoint now creates a pending request and cannot bypass approval.

## Verification

Run integration tests only with an isolated local PostgreSQL database and local admin/customer origins. Tests cover project-specific rates, approval and correction workflows, current permissions, duplicate/concurrent requests, audit history, membership balances, and the unchanged customer backend.

```sh
npx tsx --env-file=.env.local --test --test-concurrency=1 tests/*.test.ts
npm run build
```
