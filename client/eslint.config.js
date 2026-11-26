import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // The app fetches data in effects (with cancellation) instead of using a
    // query library, so flipping `loading` at the start of an effect is
    // intentional. The rest of the recommended hooks rules stay on.
    files: ['src/**/*.{js,jsx}'],
    rules: {
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  {
    // Context providers intentionally co-locate their consumer hooks, and the
    // tiny router exports its hooks next to <Link>. Fast refresh still works
    // for the components; these files are not component-only modules.
    files: ['src/context/**/*.{js,jsx}', 'src/lib/**/*.{js,jsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
