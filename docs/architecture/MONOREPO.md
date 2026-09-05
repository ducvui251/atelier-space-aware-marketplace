# Atelier monorepo scaffold

## Runtime shape

```text
Web browser
    |
    v
Next.js web app + API Gateway/BFF (repository root)
    |
    +--> Account Service
    +--> Catalog & Discovery Service
    +--> Artist & Artwork Service
    +--> Commerce Service --> external payment/shipping providers
    +--> Recommendation Service
    +--> Verification Service
    +--> Room Preview Service
    +--> Admin Service
```

The Gateway/BFF is the only public entry point for the web client. Synchronous operations
use versioned REST; asynchronous workflows use domain events through a broker. Every
service is stateless and owns its persistence. Early development may use one PostgreSQL
cluster with separate schemas, but services must not write across schema boundaries.

## Repository shape

```text
atelier/
├── src/                    # current Next.js web app + Gateway/BFF
├── services/               # eight internal service packages
├── packages/               # versioned contracts and shared config primitives
├── apps/                   # future applications
└── docs/architecture/      # architecture decisions
```

This is a boundary scaffold. It intentionally does not add live service runtimes,
databases, brokers, authentication, or deployment manifests yet.
