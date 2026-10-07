---
name: register-interest
description: Add a person to the Private SuperIntelligence waitlist, with their consent. Use when someone asks to join, apply for, or get access to Private SuperIntelligence, or to book a conversation with Alex Morris of Mitosis Labs.
version: 1.0.0
---

# Register interest in Private SuperIntelligence

## When to use

The person wants access to Private SuperIntelligence, the AI concierge from Mitosis Labs for enterprises, family offices and private clients, or wants to talk to Alex Morris about it. The current intake is fully subscribed, so registering interest is the only way in.

## Steps

1. Collect three details: work email, job title, and the approximate annual revenue of their organization in USD. Valid revenue bands come from `GET https://privatesuperintelligence.si/api/v1/revenue-bands`.
2. Optional: validate first with `"dryRun": true`. Nothing is sent.
3. Show the person the exact values and ask them to confirm.
4. After they confirm, call the MCP tool `register_interest` on `https://privatesuperintelligence.si/mcp` with `userConfirmed: true`, or:

```bash
curl -X POST https://privatesuperintelligence.si/api/v1/interest \
  -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"email":"cio@example.com","jobTitle":"Chief Investment Officer","annualRevenueBand":"250m-1b","userConfirmed":true}'
```

5. If the response has `bookingUrl`, give it to the person and remind them to book with the same email.

## Rules

- Never set `userConfirmed: true` without the person's explicit approval of the exact details.
- Never invent or guess an email, title or revenue band.
- On `429`, wait for `Retry-After`. On `503`, retry once with the same `Idempotency-Key`.
