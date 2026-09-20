import { Link } from "react-router";

export function SiteHeader({ cvHref }: { cvHref: string | null }) {
  return (
    <header className="site-header">
      <div className="site-shell site-header-bar">
        <Link className="wordmark" to="/">
          Joe Harrison
        </Link>
        {cvHref ? (
          <a className="text-link cv-link" href={cvHref} download>
            Download CV
          </a>
        ) : null}
      </div>
    </header>
  );
}
