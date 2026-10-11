import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic redirect only. The hint cookie says "this browser had a session", it grants nothing.
 * Real authorization happens on the API and in the client-side route guard.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.get("sms_session")?.value === "1";
  const isAuthPage = pathname.startsWith("/login");

  if (!hasSession && !isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  if (hasSession && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|mockServiceWorker.js|.*\\..*).*)"],
};
