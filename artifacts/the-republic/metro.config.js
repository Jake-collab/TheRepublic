const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude temporary directories Metro may try to watch during installs
config.resolver.blockList = [
  /@clerk[^/]*\/[^/]*_tmp_\d+/,
  /@supabase[^/]*\/[^/]*_tmp_\d+/,
];

// Support monorepo workspace symlinks
config.watchFolders = [path.resolve(__dirname, "../..")];

// Force React (and renderer) to one canonical path. Without this, Metro can
// resolve the same pnpm-symlinked package via two different paths when
// watchFolders includes the workspace root, producing the
// "Cannot read properties of null (reading 'useState')" crash.
config.resolver.extraNodeModules = {
  react: path.resolve(__dirname, "node_modules/react"),
  "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
  "react-native": path.resolve(__dirname, "node_modules/react-native"),
};

module.exports = config;
