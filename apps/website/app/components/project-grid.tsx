import { ProjectCard } from "~/components/project-card";
import type { PublishedProject } from "~/content/work.server";

export function ProjectGrid({ projects }: { projects: PublishedProject[] }) {
  if (projects.length === 0) {
    return null;
  }

  return (
    <ul className="project-grid">
      {projects.map((project) => (
        <li key={project.slug}>
          <ProjectCard project={project} />
        </li>
      ))}
    </ul>
  );
}
