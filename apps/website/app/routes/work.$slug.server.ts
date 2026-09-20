import { getPublishedProject } from "~/content/work.server";

export function loader({ params }: { params: { slug?: string } }) {
  const project = params.slug ? getPublishedProject(params.slug) : null;

  if (!project) {
    throw new Response("Not found", { status: 404 });
  }

  return { project };
}
