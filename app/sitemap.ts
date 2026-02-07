import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://viktorsar.ru";
  const lastModified = new Date();

  return [
    { url: `${base}/`, lastModified },
    { url: `${base}/about`, lastModified },
  ];
}
