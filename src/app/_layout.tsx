import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    "Satoshi-Black": require("../../assets/fonts/Satoshi-Black.otf"),
    "Satoshi-BlackItalic": require("../../assets/fonts/Satoshi-BlackItalic.otf"),
    "Satoshi-Bold": require("../../assets/fonts/Satoshi-Bold.otf"),
    "Satoshi-BoldItalic": require("../../assets/fonts/Satoshi-BoldItalic.otf"),
    "Satoshi-Italic": require("../../assets/fonts/Satoshi-Italic.otf"),
    "Satoshi-Light": require("../../assets/fonts/Satoshi-Light.otf"),
    "Satoshi-LightItalic": require("../../assets/fonts/Satoshi-LightItalic.otf"),
    "Satoshi-Medium": require("../../assets/fonts/Satoshi-Medium.otf"),
    "Satoshi-MediumItalic": require("../../assets/fonts/Satoshi-MediumItalic.otf"),
    "Satoshi-Regular": require("../../assets/fonts/Satoshi-Regular.otf"),
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  if (!loaded && !error) {
    return null;
  }

  return <Stack />;
}
