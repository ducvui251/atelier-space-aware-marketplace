import { FlatCompat } from "@eslint/eslintrc";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts"],
  },
  {
    // Repository boundary (MICROSERVICE_100_PLAN.md Phase 0, ADR 0001 D1):
    // browser/Gateway code never imports service package implementations or
    // fixture modules. Service data reaches the UI only through HTTP clients
    // in src/lib/gateway/clients. The single named exception is the
    // ServiceDefinition constants file; type-only imports from
    // @atelier/contracts remain allowed (it is not a service package).
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@atelier/*-service", "@atelier/*-service/*"],
              message: "Gateway code must not import service package implementations; call the service over HTTP via src/lib/gateway/clients.",
            },
            {
              group: ["@/data", "@/data/*"],
              message: "Fixture data must not be imported by Gateway code; use Gateway HTTP clients or local static assets.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/gateway/services.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];

export default eslintConfig;
