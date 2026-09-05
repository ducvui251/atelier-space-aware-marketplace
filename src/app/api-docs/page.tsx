"use client";

import Script from "next/script";
import { useEffect } from "react";

export default function ApiDocsPage() {
  useEffect(() => {
    document.title = "API Docs · ATELIER";
  }, []);

  return (
    <div>
      <link
        rel="stylesheet"
        href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css"
      />
      <div id="swagger-ui" />
      <Script
        src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"
        strategy="afterInteractive"
        onLoad={() => {
          // @ts-expect-error -- loaded globally by the CDN script above
          window.SwaggerUIBundle({
            url: "/openapi.json",
            dom_id: "#swagger-ui",
            presets: [
              // @ts-expect-error -- loaded globally by the CDN script above
              window.SwaggerUIBundle.presets.apis,
            ],
            layout: "BaseLayout",
          });
        }}
      />
    </div>
  );
}
