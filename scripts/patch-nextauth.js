const fs = require("fs");
const path = require("path");

const targetFile = path.join(__dirname, "..", "node_modules", "next-auth", "next", "index.js");

if (fs.existsSync(targetFile)) {
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

  if (content.includes(badPattern)) {
    content = content.replace(badPattern, fixedPattern);
    fs.writeFileSync(targetFile, content, "utf8");
    console.log("[PATCH] Successfully patched next-auth for Cloudflare Workers immutable headers compatibility.");
  } else if (content.includes("const resHeaders = new Headers(response.headers);")) {
    console.log("[PATCH] next-auth is already patched.");
  } else {
    // Regex fallback in case of whitespace variations
    const regex = /if\s*\(\s*\(body\s*===[\s\S]*?response\.headers\.delete\("Location"\);[\s\S]*?headers:\s*response\.headers\s*\}\);\s*\}/;
    if (regex.test(content)) {
      content = content.replace(regex, fixedPattern);
      fs.writeFileSync(targetFile, content, "utf8");
      console.log("[PATCH] Successfully patched next-auth via regex.");
    } else {
      console.warn("[PATCH WARNING] Could not find badPattern in next-auth/next/index.js");
    }
  }
} else {
  console.log("[PATCH] next-auth not installed, skipping patch.");
}
