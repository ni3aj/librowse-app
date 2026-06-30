const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Notice we are pointing it to a global.css file which we will create next!
module.exports = withNativeWind(config, { input: "./global.css" });