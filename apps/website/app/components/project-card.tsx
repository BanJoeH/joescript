import { Link } from "react-router";

import { MediaFrame } from "~/components/media-frame";
import type { PublishedProject } from "~/content/work.server";

export function ProjectCard({ project }: { project: PublishedProject }) {
  return (
    <article className="project-card">
      <MediaFrame media={project.media} />
      <div className="project-card-body">
        <p className="label">Project {project.number}</p>
        <h3 className="m-0 text-[1.75rem] leading-tight">{project.name}</h3>
        <p className="text-muted text-[0.875rem] leading-snug">
          {project.technologies.join(" · ")}
        </p>
        <p>{project.problem}</p>
        <p className="text-muted">{project.decision}</p>
        <p className="mt-auto flex flex-wrap gap-x-4 gap-y-2 pt-4">
          <Link className="text-link" to={`/work/${project.slug}`}>
            View {project.name}
          </Link>
          {project.githubUrl ? (
            <a className="text-link" href={project.githubUrl}>
              {project.name} on GitHub
            </a>
          ) : null}
        </p>
      </div>
    </article>
  );
}
