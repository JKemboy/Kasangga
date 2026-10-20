Deno.serve((_request: Request) => {
  return Response.json({
    status: "ok",
    message: "Kasangga Edge Functions working"
  });
});
