// Deprecated — auth emails are handled directly by send-signup-confirmation and send-password-reset.
Deno.serve(() => new Response(JSON.stringify({ deprecated: true }), {
  status: 410,
  headers: { 'Content-Type': 'application/json' },
}));
