import { Link } from "react-router";

import { OutcomeGrid } from "~/components/outcome-grid";
import type { CaseStudy } from "~/content/work.server";

export function FeaturedCaseStudy({ study }: { study: CaseStudy }) {
  return (
    <div className="featured-study">
      <div>
        <p className="label">Case study</p>
        <h2 className="section-heading mt-4">{study.title}</h2>
        <p className="lede">{study.context}</p>
        <p className="mt-8">
          <Link className="text-link" to={`/case-studies/${study.slug}`}>
            Read the full case study →
          </Link>
        </p>
      </div>
      <OutcomeGrid outcomes={study.outcomes} />
    </div>
  );
}
