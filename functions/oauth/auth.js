// Cloudflare Pages Function — GitHub OAuth: Step 1 (redirect to GitHub)
// Endpoint: /oauth/auth
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (!env.GITHUB_CLIENT_ID) {
    return new Response("Missing GITHUB_CLIENT_ID env variable", { status: 500 });
  }

  const params = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    scope: url.searchParams.get("scope") || "repo,user",
    state: url.searchParams.get("state") || crypto.randomUUID(),
  });

  return Response.redirect(
    `https://github.com/login/oauth/authorize?${params}`,
    302
  );
}
