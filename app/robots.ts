import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/_next", "/uploads", "/data"],
      },
    ],
    host: "https://viktorsar.ru",
    sitemap: "https://viktorsar.ru/sitemap.xml",
  };
}
