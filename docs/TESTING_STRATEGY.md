# Multi-Tier Testing Strategy

1. **Unit Tests (Vitest / Pytest)**: Fast, deterministic execution of pure functions and domain logic (target >90% coverage).
2. **Integration Tests**: Verification of database repositories, RLS policies, and API endpoint contracts.
3. **End-to-End Tests (Playwright)**: Full browser automation verifying critical user conversion workflows.
4. **Chaos & Resilience**: Network failure simulation, token expiration, and rate-limiting boundary verification.
