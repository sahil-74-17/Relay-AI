import { NextResponse, type NextRequest } from "next/server";

const APP_PATHS = ["/dashboard", "/tickets", "/assistant", "/review", "/incidents", "/knowledge", "/admin"];

/** Fast redirect for signed-out visitors. The API still enforces auth + RBAC on every call. */
export function middleware(req: NextRequest) {
  const hasSession = req.cookies.has("si_token");
  const { pathname } = req.nextUrl;
  // The design exploration is a development aid; never expose it in production.
  if (process.env.NODE_ENV === "production" && pathname.startsWith("/design-lab")) {
    return NextResponse.redirect(new URL("/", req.url));
  }
  if (!hasSession && APP_PATHS.some((p) => pathname.startsWith(p))) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && pathname === "/login") return NextResponse.redirect(new URL("/dashboard", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next|favicon).*)"] };
