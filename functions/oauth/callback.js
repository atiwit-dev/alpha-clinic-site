// Cloudflare Pages Function — GitHub OAuth: Step 2 (exchange code for token)
// Endpoint: /oauth/callback
export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing 'code' parameter", { status: 400 });
  }

  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response("Missing GitHub OAuth env variables", { status: 500 });
  }

  // Exchange code for access token
  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      "User-Agent": "Decap-CMS-OAuth",
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const data = await tokenResponse.json();
  const status = data.access_token ? "success" : "error";
  const content = data.access_token
    ? { token: data.access_token, provider: "github" }
    : { error: data.error_description || data.error || "Unknown error" };

  const messagePayload = `authorization:github:${status}:${JSON.stringify(content)}`;

  // Send token back to opener window (Decap CMS) via postMessage
  return new Response(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OAuth ${status}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; padding: 60px 24px; text-align: center; background: #faf6ee; color: #1d1b17; }
    h2 { font-weight: 500; margin: 0 0 12px; }
    p { color: #4f4c46; }
    .icon { font-size: 56px; margin-bottom: 16px; }
  </style>
</head>
<body>
  <div class="icon">${status === "success" ? "✅" : "❌"}</div>
  <h2>${status === "success" ? "เข้าระบบสำเร็จ" : "เกิดข้อผิดพลาด"}</h2>
  <p>${status === "success" ? "กำลังกลับไปหน้า admin..." : "กรุณาปิดหน้านี้แล้วลองอีกครั้ง"}</p>
  <script>
    (function() {
      function receive(e) {
        if (window.opener) {
          window.opener.postMessage(${JSON.stringify(messagePayload)}, e.origin);
        }
        window.removeEventListener("message", receive, false);
      }
      window.addEventListener("message", receive, false);
      if (window.opener) {
        window.opener.postMessage("authorizing:github", "*");
      }
    })();
  </script>
</body>
</html>`,
    {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}
