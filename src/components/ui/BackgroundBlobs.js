import { StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

export default function BackgroundBlobs() {
  return (
    <View style={StyleSheet.absoluteFill} className="z-0">
      <Svg viewBox="0 0 400 800" fill="none">
        {/* Magenta Blob - Top Right */}
        <Path
          fill="#C13383"
          fillOpacity="0.07"
          d="M400 0C320 0 250 80 250 160C250 240 350 280 400 280V0Z"
        />
        {/* Indigo Blob - Bottom Left */}
        <Path
          fill="#443199"
          fillOpacity="0.06"
          d="M0 800C80 800 150 720 150 640C150 560 50 520 0 520V800Z"
        />
        {/* Coral Blob - Bottom Right */}
        <Path
          fill="#E05454"
          fillOpacity="0.05"
          d="M400 800C300 800 250 700 300 600C350 500 400 550 400 600V800Z"
        />
      </Svg>
    </View>
  );
}
