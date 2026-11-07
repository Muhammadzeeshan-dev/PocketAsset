import { ResetPasswordPage } from "@/components/reset-password-page";

export const metadata = {
  title: "Reset Password - PocketAsset",
  description: "Set a new master password for your PocketAsset account.",
};

export default function ResetPasswordRoute() {
  return <ResetPasswordPage />;
}
