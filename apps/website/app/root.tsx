import { isRouteErrorResponse, Links, Meta, Outlet } from "react-router";

import { SiteFooter } from "~/components/site-footer";
import { SiteHeader } from "~/components/site-header";
import { site } from "~/content/site";

import type { Route } from "./+types/root";
import "./app.css";

export const links: Route.LinksFunction = () => [
  { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <Meta />
        <Links />
      </head>
      <body>{children}</body>
    </html>
  );
}

export default function App() {
  return (
    <>
      <SiteHeader cvHref={site.cvHref} />
      <Outlet />
      <SiteFooter
        invitation={site.invitation}
        location={site.location}
        email={site.email}
        privateRepositories={site.privateRepositories}
        githubHref={site.githubHref}
        linkedinHref={site.linkedinHref}
        cvHref={site.cvHref}
      />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let title = "Something went wrong";
  let detail = "An unexpected error occurred.";

  if (isRouteErrorResponse(error)) {
    title = error.status === 404 ? "Page not found" : "Something went wrong";
    detail = error.status === 404 ? "That page is not on this site." : error.statusText || detail;
  } else if (import.meta.env.DEV && error instanceof Error) {
    detail = error.message;
  }

  return (
    <>
      <title>{`${title} · Joe Harrison`}</title>
      {isRouteErrorResponse(error) && error.status === 404 ? (
        <meta name="robots" content="noindex" />
      ) : null}
      <SiteHeader cvHref={site.cvHref} />
      <main id="main" className="site-shell site-section">
        <h1 className="section-heading">{title}</h1>
        <p className="mt-4">{detail}</p>
        <p className="mt-6">
          <a className="text-link" href="/">
            Back to the homepage
          </a>
        </p>
      </main>
      <SiteFooter
        invitation={site.invitation}
        location={site.location}
        email={site.email}
        privateRepositories={site.privateRepositories}
        githubHref={site.githubHref}
        linkedinHref={site.linkedinHref}
        cvHref={site.cvHref}
      />
    </>
  );
}
