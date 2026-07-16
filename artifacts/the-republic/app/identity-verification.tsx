import { Stack } from "expo-router";
import IdentityVerificationScreen from "@/components/IdentityVerificationScreen";

export default function IdentityVerificationRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <IdentityVerificationScreen />
    </>
  );
}
