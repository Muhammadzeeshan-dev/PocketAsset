import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PocketAsset — Personal Finance",
    short_name: "PocketAsset",
    description: "Track every rupee and understand your financial position.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#1d4ed8",
    orientation: "portrait-primary",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
