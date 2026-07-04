import type { MetadataRoute } from "next";

/**
 * Web app manifest so the app can be added to a phone's home screen.
 * Icons and a service worker (offline support) are still pending — see the
 * "PWA status" note in the README.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "reforma-agent",
    short_name: "reforma",
    description: "Intelligent home renovation tracking",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f3",
    theme_color: "#2f6f4f",
    icons: [],
  };
}
