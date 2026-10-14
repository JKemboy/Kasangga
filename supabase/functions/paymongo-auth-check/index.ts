Deno.serve(async (_request: Request) => {
  const secret = Deno.env.get("PAYMONGO_SECRET_KEY");

  if (!secret) {
    return Response.json(
      { result: "SECRET_MISSING" },
      { status: 500 }
    );
  }

  if (!secret.startsWith("sk_test_")) {
    return Response.json(
      { result: "NOT_A_TEST_KEY" },
      { status: 500 }
    );
  }

  try {
    // Read-only API request using an existing checkout session.
    const response = await fetch(
      "https://api.paymongo.com/v1/checkout_sessions/cs_9135f3c51cc25e8002fb28f9",
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${btoa(`${secret}:`)}`
        },
        signal: AbortSignal.timeout(10000)
      }
    );

    return Response.json({
      result: response.ok ? "AUTH_OK" : "AUTH_FAILED",
      paymongo_http_status: response.status
    });
  } catch {
    return Response.json(
      { result: "NETWORK_ERROR" },
      { status: 502 }
    );
  }
});
