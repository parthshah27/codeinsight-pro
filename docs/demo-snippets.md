# Demo Snippets

Use these examples in the hosted demo to show that mock mode is deterministic and still useful without a paid LLM key.

## SQL Injection

```js
function getUser(id) {
  return db.query(`SELECT * FROM users WHERE id=${id}`);
}
```

Expected signal: critical security finding for query construction.

## Missing Fetch Handling

```js
async function loadProfile(userId) {
  const response = await fetch(`/api/users/${userId}`);
  return response.json();
}
```

Expected signal: major reliability finding for missing error handling.

## Secret Handling

```js
const apiKey = "sk_test_123";

export function callProvider(input) {
  console.log(apiKey);
  return fetch("https://example.com", {
    headers: { Authorization: `Bearer ${apiKey}` },
    body: input
  });
}
```

Expected signal: possible secret exposure and console logging feedback.
