import type { ReactNode } from "react";

import { loadProjectAccess } from "../../../lib/project-access";
import { ProjectViewShell } from "./project-view-shell";
import { ProjectTimeline } from "./project-timeline";

interface ProjectLayoutProps {
  children: ReactNode;
  params: Promise<{ projectId: string }>;
}

export default async function ProjectLayout({ children, params }: ProjectLayoutProps) {
  const { projectId } = await params;
  const { supabase, project, stakeholderType } = await loadProjectAccess(projectId);
  const [{ data: visits }, { data: decisions }, { data: weeklySummaries }] = await Promise.all([
    supabase
      .from("visits")
      .select("id, title, visit_date")
      .eq("project_id", project.id)
      .order("visit_date", { ascending: false })
      .limit(20),
    supabase
      .from("decisions")
      .select("id, title, deadline")
      .eq("project_id", project.id)
      .not("deadline", "is", null)
      .order("deadline", { ascending: false })
      .limit(20),
    supabase
      .from("weekly_summaries")
      .select("id, title, week_end")
      .eq("project_id", project.id)
      .order("week_end", { ascending: false })
      .limit(12),
  ]);
  const milestones = [
    ...(visits ?? []).map((visit) => ({
      date: visit.visit_date,
      label: visit.title,
      kind: "visit" as const,
    })),
    ...(decisions ?? [])
      .filter((decision) => Boolean(decision.deadline))
      .map((decision) => ({
        date: decision.deadline!,
        label: decision.title,
        kind: "decision" as const,
      })),
    ...(weeklySummaries ?? []).map((summary) => ({
      date: summary.week_end,
      label: summary.title,
      kind: "summary" as const,
    })),
  ];

  return (
    <ProjectViewShell
      key={projectId}
      projectId={projectId}
      defaultFieldView={stakeholderType === "site_manager"}
    >
      <ProjectTimeline
        projectCreatedAt={project.created_at}
        startDate={project.start_date}
        deadlineDate={project.deadline_date}
        milestones={milestones}
      />
      {children}
    </ProjectViewShell>
  );
}
