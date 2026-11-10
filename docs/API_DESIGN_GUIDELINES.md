# REST & GraphQL API Design Guidelines

- Idempotent write operations via explicit UUID request tokens.
- Strict payload validation using Zod or Pydantic before processing.
- Standardized pagination (cursor-based pagination for unbounded data streams).
- Explicit HTTP status codes (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 429 Too Many Requests).
