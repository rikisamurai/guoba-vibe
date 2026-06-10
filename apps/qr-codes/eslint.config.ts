import { fixupConfigRules } from '@eslint/compat'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import { defineConfig, globalIgnores } from 'eslint/config'

const eslintConfig = defineConfig([
  // Next's transitive plugins have not all published ESLint 10 peer ranges yet.
  ...fixupConfigRules([...nextVitals, ...nextTs]),
  {
    files: ['src/**/*.{js,jsx,ts,tsx}'],
    // Tests (apps/qr-codes/tests/, outside src) are already exempt; guard co-located ones too.
    ignores: ['src/**/*.test.{js,jsx,ts,tsx}'],
    linterOptions: {
      // A stale `eslint-disable max-lines` (file shrank back under 200) must be removed.
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      'max-lines': [
        'error',
        {
          max: 200,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    // Vendored shadcn components — not linted at all (matches qr-vault).
    'src/components/shadcn-ui/**',
  ]),
])

export default eslintConfig
