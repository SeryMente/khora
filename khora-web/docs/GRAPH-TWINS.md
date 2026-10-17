# Paired graphs — candidate, NOT production acceptance

This candidate implements two independently calculated projections from the same versioned extraction proposals. Automatic means system acceptance, never a human judgment. Curated includes only explicit relation-and-endpoint approvals made through this candidate's authenticated review route. Legacy `actor=operador` judgments are NOT imported as trusted human approvals.

## Boundary

This is a new reconstructible read model in the existing PostgreSQL database, not a replacement deployment of the Python/Neo4j kernel and not a claim of full EpisTwin fidelity. Existing originals, versions, legacy proposals, judgments and Neo4j contents are not rewritten. This candidate's encrypted proposals, immutable human ledger and atomically paired snapshots use `grafo_par_*` tables (migration 032). The original `/api/grafo` endpoint remains unchanged; the new `/api/grafos` is owner-scoped and requires both an authenticated session and an unlocked vault. No service-auth bypass is added.

## Reproducibility and source fidelity

Only exact approved source versions are selected; inconsistent approved tuples fail closed rather than disappearing silently. Each provider call uses the existing Groq configuration, deterministic temperature 0 and a stored prompt/hash. Exact source quotations must match a unique contiguous occurrence in the source chunk and include both lexical endpoints. UTF-16 offsets are half-open. Negation, modality, attribution and explicitly declared event time travel with each relation. Coverage gaps remain explicitly pending review, not declared meaningless. Invalid source anchors are counted and cannot become graph edges. An anchor check proves provenance, NOT interpretation fidelity.

Leiden uses pinned Graphology implementation 1.1.1, weighted modularity, resolution 1, seed 42, no iteration cap, no desired number of communities. Weights count distinct grounded relation occurrences. Coverage and connectedness are validated. Layout does not assign communities. Capacity failures are explicit, not silent truncation.

## IMPORTANT current limitation / publication blocker

Lexical nodes are local to each source version. This deliberately avoids unsupported identity merges, but it ALSO prevents cross-source communities. Therefore this candidate is NOT the finished corpus-wide personal graph requested by the operator. A grounded, auditable cross-source identity proposal stage is still required; manual cluster configuration or fusion by mere semantic similarity is not an acceptable substitute. Novelty/repetition classification for recoverable asynchronous ideation remains deferred and is not that identity stage.

The new page also needs a regression pass for pre-existing scoped graph links (`io_id`, `volcado_id`, `limit`); no compatibility claim is made. No publication or merge to main is authorized by passing synthetic tests alone. The operator must review the actual presentation and real corpus outcome before final promotion.

## Verified only in isolated tests

519 unit tests, typecheck and an initial full Next build passed. A separate synthetic PostgreSQL/PGlite test exercised migration, encrypted storage, paired persistence/read, owner isolation, append-only judgments, request idempotence, explicit human attribution, automatic/curated separation, source-integrity failure, and route responses 401/423/403/200. Its single-connection adapter does not test distributed locks. Production dependency audit reported zero findings; the full install reported eight high-severity development findings, not silently fixed.

Not verified: production credentials, production migration, real corpus extraction, corpus-wide identity resolution, distributed concurrency, final production rendering. Production URL still served commit 40295db4f3e19793099653db5dafe76c1fb50e9d at the last check. Do not describe this branch as deployed or end-to-end complete.
