import globals from "globals";
import pluginJs from "@eslint/js";
import pluginReactConfig from "eslint-plugin-react/configs/recommended.js";
import { fixupConfigRules } from "@eslint/compat";
import pluginSecurity from 'eslint-plugin-security';

export default [
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      sourceType: "module",
      // Define Node.js globals here
      globals: {
        ...globals.node, // Spread operator to include all Node.js globals
        __dirname: "readonly",
        process: "readonly",
        server: "readonly",
        module: "writable",
        require: "readonly"
      }
    },
  },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
  pluginJs.configs.recommended,
  ...fixupConfigRules(pluginReactConfig),
  pluginSecurity.configs.recommended,
];