# Catalog & Discovery Service

Owns catalog discovery reads, search, filters, tags, and their cache/index workflows.
Expensive indexing belongs in background jobs, not the request path.
