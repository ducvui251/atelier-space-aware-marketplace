# Atelier services

This directory contains the eight internal service boundaries defined by
`PROJECT_PROMPT.md`. Each service is a private workspace package and is intended to be
stateless, independently deployable, and responsible for its own persistence.

The web client calls the Next.js API Gateway/BFF at the repository root. It must not call
internal services directly. Payment providers and shipping carriers remain external
integrations, not additional Atelier services.

| Service | Responsibility |
| --- | --- |
| `account-service` | User profile, roles, and authentication integration |
| `catalog-discovery-service` | Catalog, search, filters, tags, and discovery reads |
| `artist-artwork-service` | Artist profiles, artwork metadata, editions, and inventory |
| `commerce-service` | Cart, checkout, order creation, and payment orchestration |
| `recommendation-service` | Taste signals, room-aware ranking, and recommendations |
| `verification-service` | Artist/artwork verification, COA, and review status |
| `room-preview-service` | Room templates, artwork placement, and optional 3D/AR preview |
| `admin-service` | Moderation, incidents, audit records, and reporting |

This commit creates boundaries and package metadata only; it does not add live APIs,
databases, queues, or authentication.
