Deno.serve((_request: Request) => {
  return Response.json({
    status: "ok",
    message: "CampusTutor Edge Functions working"
  });
});
