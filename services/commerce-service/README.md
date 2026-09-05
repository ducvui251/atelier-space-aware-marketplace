# Commerce Service

Owns cart, checkout, order creation, and payment orchestration. Payment providers and
shipping carriers are external integrations; idempotency and compensating actions are
required for cross-service workflows.
