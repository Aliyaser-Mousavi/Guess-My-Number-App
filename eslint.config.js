// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const reactNativePlugin = require('eslint-plugin-react-native');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      'react-native': reactNativePlugin,
    },
    rules: {
      // Disable false-positive AST check on logical expressions in JSX and custom text components
      'react-native/no-raw-text': 'off',
    },
  },
  {
    ignores: ['dist/*', 'supabase/**/*', '.expo/**/*'],
  },
]);
