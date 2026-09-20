import { Link } from "react-router";

import { MediaFrame } from "~/components/media-frame";
import { OutcomeGrid } from "~/components/outcome-grid";
import type { MediaAsset, Outcome } from "~/content/work.server";

type Section = {
  heading: string;
  body?: string;
  items?: { title: string; body: string }[];
};

export function CaseStudyLayout({
  kicker,
  title,
  summary,
  media,
  outcomes,
  sections,
  technologies,
  links,
  breadcrumb,
}: {
  kicker: string;
  title: string;
  summary: string;
  media?: MediaAsset | null;
  outcomes?: Outcome[];
  sections: Section[];
  technologies?: string[];
  links?: { href: string; label: string }[];
  breadcrumb?: { href: string; label: string };
}) {
  return (
    <main id="main" className="site-section" tabIndex={-1}>
      <article className="site-shell">
        {breadcrumb ? (
          <nav aria-label="Breadcrumb">
            <ol className="breadcrumb">
              <li>
                <Link className="text-link" to={breadcrumb.href}>
                  {breadcrumb.label}
                </Link>
              </li>
              <li aria-current="page">{title}</li>
            </ol>
          </nav>
        ) : null}
        <p className="label">{kicker}</p>
        <h1 className="mt-4">{title}</h1>
        <p className="lede">{summary}</p>
        {media ? (
          <div className="mt-10">
            <MediaFrame media={media} priority framed />
          </div>
        ) : null}
        {outcomes && outcomes.length > 0 ? (
          <div className="mt-12">
            <OutcomeGrid outcomes={outcomes} />
          </div>
        ) : null}
        <div className="stack">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="section-heading">{section.heading}</h2>
              {section.body ? <p className="lede">{section.body}</p> : null}
              {section.items ? (
                <ul className="decision-list">
                  {section.items.map((item) => (
                    <li key={item.title}>
                      <h3 className="m-0 text-[1.35rem] leading-snug">{item.title}</h3>
                      <p className="mt-2">{item.body}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
          {technologies && technologies.length > 0 ? (
            <section>
              <h2 className="section-heading">Technology</h2>
              <p className="lede">{technologies.join(", ")}</p>
            </section>
          ) : null}
          {links && links.length > 0 ? (
            <section>
              <h2 className="section-heading">Links</h2>
              <ul className="link-list">
                {links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith("/") ? (
                      <Link className="text-link" to={link.href}>
                        {link.label}
                      </Link>
                    ) : (
                      <a className="text-link" href={link.href}>
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </article>
    </main>
  );
}
