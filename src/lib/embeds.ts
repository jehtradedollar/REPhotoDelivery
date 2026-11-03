// Turn share links from video and 3D tour platforms into embeddable player URLs.

const PROVIDERS: { name: string; test: RegExp }[] = [
  { name: "YouTube", test: /(^|\.)youtube\.com$|(^|\.)youtu\.be$/ },
  { name: "Vimeo", test: /(^|\.)vimeo\.com$/ },
  { name: "Matterport", test: /(^|\.)matterport\.com$/ },
  { name: "iGUIDE", test: /(^|\.)youriguide\.com$|(^|\.)iguide\./ },
  { name: "Zillow 3D Home", test: /(^|\.)zillow\.com$/ },
  { name: "Kuula", test: /(^|\.)kuula\.co$/ },
  { name: "CloudPano", test: /(^|\.)cloudpano\.com$/ },
];

export function embedInfo(raw: string): { provider: string; embedUrl: string | null } {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { provider: "Link", embedUrl: null };
  }
  if (u.protocol !== "https:") return { provider: "Link", embedUrl: null };
  const host = u.hostname.toLowerCase();
  const provider = PROVIDERS.find((p) => p.test.test(host))?.name ?? "Link";

  if (provider === "YouTube") {
    const id = host.endsWith("youtu.be") ? u.pathname.slice(1) : u.searchParams.get("v") ?? u.pathname.match(/\/(?:embed|shorts|live)\/([\w-]+)/)?.[1];
    return { provider, embedUrl: id ? `https://www.youtube-nocookie.com/embed/${id}` : null };
  }
  if (provider === "Vimeo") {
    if (host.startsWith("player.")) return { provider, embedUrl: u.toString() };
    const m = u.pathname.match(/\/(\d+)(?:\/([\da-f]+))?/);
    return { provider, embedUrl: m ? `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}` : null };
  }
  // Matterport, iGUIDE, Kuula and similar share links embed as-is.
  return { provider, embedUrl: provider === "Link" ? null : u.toString() };
}
