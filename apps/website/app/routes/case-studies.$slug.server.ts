import { getPublishedCaseStudy } from "~/content/work.server";

export function loader({ params }: { params: { slug?: string } }) {
  const study = params.slug ? getPublishedCaseStudy(params.slug) : null;

  if (!study) {
    throw new Response("Not found", { status: 404 });
  }

  return { study };
}
