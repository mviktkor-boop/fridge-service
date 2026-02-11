import fs from "fs";
import path from "path";
import HomeClient from "./home-client";

function readSiteSettings(): any {
  try {
    const p = path.join(process.cwd(), "data", "site-settings.json");
    if (!fs.existsSync(p)) return {};
    return JSON.parse(fs.readFileSync(p, "utf-8") || "{}");
  } catch {
    return {};
  }
}

export default function Page() {
  const initialSite = readSiteSettings();
  return <HomeClient initialSite={initialSite} />;
}
