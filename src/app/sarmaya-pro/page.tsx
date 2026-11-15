import { PocketAssetApp } from "@/components/pocketasset-app";

export const metadata = {
  title: "Sarmaya Pro Terminal | PocketAsset",
  description:
    "Institutional-grade wealth terminal: PSX dividend forecasting, 30-year Monte Carlo wealth simulation, and macroeconomic stress testing without fees.",
};

export default function SarmayaProPage() {
  return <PocketAssetApp section="sarmaya-pro" />;
}
