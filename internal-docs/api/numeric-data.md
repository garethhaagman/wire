# Numeric data

## Core rule

Use JSON numbers by default. Use JSON strings only when the value requires exact representation or is not genuinely numeric data. **Never stringify a number just to sidestep floating-point concerns** — that trades a real precision rule for a superstition, and breaks the "same field, same type, every response" guarantee in [responses.md](./responses.md).

## When to use each type

| Data type / use case                                     | Must use                                          |
| -------------------------------------------------------- | ------------------------------------------------- |
| Integers (`2`, `100`, `5000`)                            | Number                                            |
| Ordinary decimals (`2.2`, `0.002`)                       | Number                                            |
| Percentages and ratios                                   | Number                                            |
| Measurements and quantities                              | Number                                            |
| Ratings and scores                                       | Number                                            |
| Latitude and longitude                                   | Number                                            |
| Integers within ±(2⁵³ − 1)                               | Number                                            |
| Integers outside ±(2⁵³ − 1)                              | String                                            |
| High-precision decimals requiring exact preservation     | String                                            |
| Financial amounts requiring exact decimal representation | String, or integer minor units                    |
| Identifiers, reference numbers, IDs                      | **String** — always, even if the ID is all digits |
| Phone numbers, postcodes, account numbers                | String                                            |

The ±(2⁵³ − 1) boundary is the JavaScript/IEEE 754 safe-integer limit, not a JSON-spec restriction — RFC 8259 and RFC 7493 (I-JSON) call it out as the conservative, interoperable choice for exactly this reason: any client parsing with a double-precision float (JS, and many JSON parsers generally) silently loses precision past that point.

## Rules

1. Never stringify ordinary numbers — `2`, `2.2`, `0.002` are JSON numbers, full stop.
2. Never return unsafe integers (outside ±(2⁵³ − 1)) as JSON numbers — serialize as a string.
3. Never rely on floating-point arithmetic for exact decimal calculations — use decimal arithmetic or integer minor units (`amount_minor: 1999` for £19.99, not `amount: 19.99`).
4. Never treat identifiers as numbers, even all-digit ones — `Workspace["id"]` is `` `ws_${string}` ``, never a bare number, and this holds for every resource ID in the system (see `packages/types/src/*.ts`).
5. Never use a string as a rounding workaround — define explicit precision/rounding rules in the service layer instead of pushing the ambiguity onto the client via string formatting.
6. Never return `NaN` or `Infinity` — neither is valid JSON. Document and return an explicit error or sentinel instead (e.g. omit the field, or a documented `null`).
7. Keep the type consistent per field across every response — a field must never alternate between number and string depending on its value. (This is the main failure mode the mandatory-string-for-unsafe-integers rule exists to avoid turning into: don't make a field "usually a number, sometimes a string.")

## Examples

Correct:

```json
{
  "quantity": 2,
  "rating": 2.2,
  "ratio": 0.002,
  "percentage": 85.5,
  "user_id": "12345678901234567890",
  "price": { "amount": "19.99", "currency": "GBP" },
  "amount_minor": 1999
}
```

Incorrect:

```json
{
  "quantity": "2",
  "rating": "2.2",
  "ratio": "0.002",
  "percentage": "85.5",
  "user_id": 12345678901234567890
}
```

## Applying this in Wire's DTOs

- Every `@wire/types` resource ID is already a string-literal template type (`` `ws_${string}` ``, `` `agt_${string}` ``, etc.) — never introduce a numeric ID field.
- `@ApiProperty()` on a DTO field for an ID must declare `type: String` (or let it infer from the TS `string` type) — never `type: Number`, even temporarily.
- If a future resource needs a genuinely large integer (e.g. a token count, byte count, or sequence number that could exceed 2⁵³ − 1), type it as `string` in both `@wire/types` and the DTO, and document it in that resource's field table.
- Money fields follow Stripe/PayPal convention: an integer minor-unit field (`amount_minor`) is preferred over a decimal string when the currency's minor unit is well-defined; use a decimal string (`"19.99"`) only when minor units don't apply cleanly.

## Lint enforcement

`@wire/eslint-plugin-wire-api`'s `no-numeric-id` rule flags any DTO class property named like an ID (`id`, `*Id`, `*_id`) typed as `number` or decorated with `@ApiProperty({ type: Number })`/`@IsNumber()`. See [../../packages/eslint-plugin-wire-api](../../packages/eslint-plugin-wire-api).

Precision/rounding and the `NaN`/`Infinity` rules aren't statically checkable by a lint rule — they're runtime data concerns, caught by tests and code review, not the linter. The ID-typing rule is the one static guarantee this doc's rules reduce to.

## References

- [RFC 8259 — JSON, §6 Numbers](https://www.rfc-editor.org/rfc/rfc8259.html)
- [RFC 7493 — I-JSON, §2.2](https://www.rfc-editor.org/rfc/rfc7493.html)
- [OpenAPI Specification — `integer`/`number`/`string` schema types](https://spec.openapis.org/oas/latest.html)
- [Google ProtoJSON — 64-bit integers serialized as strings](https://protobuf.dev/programming-guides/json/)
- [Stripe currency documentation — amounts in minor units](https://docs.stripe.com/currencies)
- [PayPal Money object — decimal values as strings](https://developer.paypal.com/api/payments/v2/definitions/money/)
