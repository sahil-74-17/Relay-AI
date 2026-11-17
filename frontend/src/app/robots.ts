import type { MetadataRoute } from "next";

/**
 * The public marketing page may be indexed; everything behind sign-in (customer
 * conversations, tickets, knowledge base, admin) must stay out of search results.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/dashboard",
        "/tickets",
        "/assistant",
        "/review",
        "/incidents",
        "/knowledge",
        "/admin",
        "/login",
        "/api/",
      ],
    },
  };
}
