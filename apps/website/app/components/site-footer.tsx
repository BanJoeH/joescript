import type { site } from "~/content/site";

export function SiteFooter({
  invitation,
  location,
  email,
  privateRepositories,
  githubHref,
  linkedinHref,
  cvHref,
}: {
  invitation: string;
  location: string;
  email: string;
  privateRepositories: string;
  githubHref: typeof site.githubHref;
  linkedinHref: typeof site.linkedinHref;
  cvHref: typeof site.cvHref;
}) {
  return (
    <footer id="contact" className="site-footer">
      <div className="site-shell site-section">
        <h2 className="section-heading">{invitation}</h2>
        <p className="mt-6">{location}</p>
        <p className="mt-2">
          <a className="text-link" href={`mailto:${email}`}>
            {email}
          </a>
        </p>
        <p className="mt-8 max-w-[62ch] text-muted">{privateRepositories}</p>
        {githubHref || linkedinHref || cvHref ? (
          <ul className="link-list">
            {githubHref ? (
              <li>
                <a className="text-link" href={githubHref}>
                  GitHub
                </a>
              </li>
            ) : null}
            {linkedinHref ? (
              <li>
                <a className="text-link" href={linkedinHref}>
                  LinkedIn
                </a>
              </li>
            ) : null}
            {cvHref ? (
              <li>
                <a className="text-link" href={cvHref} download>
                  Download CV
                </a>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
    </footer>
  );
}
