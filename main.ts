const PROXY_URL = "https://plainproxies.com/resources/free-web-proxy";

const parseCookie = (cookie: string) => {
  const cookieParts = cookie.split(";")[0].split("=");
  return {
    key: cookieParts[0].trim(),
    value: cookieParts[1].trim(),
  };
};

const handleWebProxyRedirect = async (_req: Request) => {
  const originUrlObj = new URL(_req.url);
  // console.log("req url", originUrlObj.pathname);

  if (originUrlObj.pathname === "/favicon.ico") {
    return new Response(null, { status: 404 });
  }
  if (originUrlObj.pathname.length === 1) {
    return new Response("Welcome to the Edge Web Proxy!");
  }

  const targetUrl = originUrlObj.pathname.slice(1);
  // console.log("target url", targetUrl);

  const proxyPageResponse = await fetch(PROXY_URL);
  const cookies = proxyPageResponse.headers
    .getSetCookie()
    .map((cookie) => parseCookie(cookie));
  const proxyPageResponseHtml = await proxyPageResponse.text();
  // @ts-expect-error some deno issue
  const proxyFormCsrfToken = proxyPageResponseHtml.match(
    /<input\s+[^>]*name="_token"[^>]*value="([^"]*)"/
  )[1];

  // console.log("cookies", cookies);
  // console.log("proxyFormToken", proxyFormCsrfToken);

  const proxyRedirectResponse = await fetch(PROXY_URL, {
    method: "POST",
    headers: {
      cookie: cookies
        .map((cookie) => `${cookie.key}=${cookie.value}`)
        .join(";"),
    },
    body: new URLSearchParams({
      _token: proxyFormCsrfToken,
      url: targetUrl,
    }),
    redirect: "manual",
  });

  if (
    proxyRedirectResponse.status >= 300 &&
    proxyRedirectResponse.status <= 399
  ) {
    const proxyRedirectLocation =
      proxyRedirectResponse.headers.get("Location")!;

    // console.log("proxy redirect status", proxyRedirectResponse.status);
    // console.log("proxy redirect location", proxyRedirectLocation);

    return new Response("Hello, World!", {
      status: 302,
      headers: { Location: proxyRedirectLocation },
    });
  } else {
    return new Response("Failed to proxy", { status: 500 });
  }
};

Deno.serve(handleWebProxyRedirect);
