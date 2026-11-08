const fs = require("fs");
const path = require("path");

function patchUtils() {
  const targetFile = path.join(__dirname, "..", "node_modules", "next-auth", "next", "utils.js");
  if (!fs.existsSync(targetFile)) {
    console.log("[PATCH] next-auth/next/utils.js not found, skipping.");
    return;
  }

  let content = fs.readFileSync(targetFile, "utf8");

  const badPattern = `  const status = res.redirect ? 302 : (_res$status = res.status) !== null && _res$status !== void 0 ? _res$status : 200;
  const response = new Response(body, {
    headers,
    status
  });
  if (res.redirect) response.headers.set("Location", res.redirect);
  return response;`;

  const fixedPattern = `  const status = res.redirect ? 302 : (_res$status = res.status) !== null && _res$status !== void 0 ? _res$status : 200;
  if (res.redirect) headers.set("Location", res.redirect);
  const response = new Response(body, {
    headers,
    status
  });
  return response;`;

  if (content.includes("if (res.redirect) headers.set(\"Location\", res.redirect);")) {
    console.log("[PATCH] next-auth/next/utils.js is already patched.");
  } else if (content.includes(badPattern)) {
    content = content.replace(badPattern, fixedPattern);
    fs.writeFileSync(targetFile, content, "utf8");
    console.log("[PATCH] Successfully patched next-auth/next/utils.js for Cloudflare Workers.");
  } else {
    // Regex fallback
    const regex = /const\s+status\s*=\s*res\.redirect[\s\S]*?if\s*\(\s*res\.redirect\s*\)\s*response\.headers\.set\("Location",\s*res\.redirect\);\s*return\s+response;/;
    if (regex.test(content)) {
      content = content.replace(regex, fixedPattern);
      fs.writeFileSync(targetFile, content, "utf8");
      console.log("[PATCH] Successfully patched next-auth/next/utils.js via regex.");
    } else {
      console.warn("[PATCH WARNING] Could not match target in next-auth/next/utils.js");
    }
  }
}

function patchIndex() {
  const targetFile = path.join(__dirname, "..", "node_modules", "next-auth", "next", "index.js");
  if (!fs.existsSync(targetFile)) {
    console.log("[PATCH] next-auth/next/index.js not found, skipping.");
    return;
  }

  let content = fs.readFileSync(targetFile, "utf8");

  const badPattern = `  if ((body === null || body === void 0 ? void 0 : body.json) === "true" && redirect) {
    response.headers.delete("Location");
    response.headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify({
      url: redirect
    }), {
      status: internalResponse.status,
      headers: response.headers
    });
  }`;

  const fixedPattern = `  if ((body === null || body === void 0 ? void 0 : body.json) === "true" && redirect) {
    const resHeaders = new Headers(response.headers);
    resHeaders.delete("Location");
    resHeaders.set("Content-Type", "application/json");
    return new Response(JSON.stringify({
      url: redirect
    }), {
      status: internalResponse.status,
      headers: resHeaders
    });
  }`;

  if (content.includes("const resHeaders = new Headers(response.headers);")) {
    console.log("[PATCH] next-auth/next/index.js is already patched.");
  } else if (content.includes(badPattern)) {
    content = content.replace(badPattern, fixedPattern);
    fs.writeFileSync(targetFile, content, "utf8");
    console.log("[PATCH] Successfully patched next-auth/next/index.js for Cloudflare Workers.");
  } else {
    // Regex fallback
    const regex = /if\s*\(\s*\(body\s*===[\s\S]*?response\.headers\.delete\("Location"\);[\s\S]*?headers:\s*response\.headers\s*\}\);\s*\}/;
    if (regex.test(content)) {
      content = content.replace(regex, fixedPattern);
      fs.writeFileSync(targetFile, content, "utf8");
      console.log("[PATCH] Successfully patched next-auth/next/index.js via regex.");
    } else {
      console.warn("[PATCH WARNING] Could not match target in next-auth/next/index.js");
    }
  }
}

patchUtils();
patchIndex();
