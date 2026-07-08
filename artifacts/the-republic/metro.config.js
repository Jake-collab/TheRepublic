const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

// Exclude temporary clerk directories that Metro may try to watch
const clerkTmpPattern = /@clerk[^/]*\/[^/]*_tmp_\d+/;
config.resolver.blockList = [clerkTmpPattern];

// Support monorepo workspace symlinks
config.watchFolders = [path.resolve(__dirname, "../..")];

module.exports = config;
