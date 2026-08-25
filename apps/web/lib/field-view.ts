export type FieldNavigationSection = "today" | "updates" | "attention" | "more";

export function fieldViewStorageKey(projectId: string): string {
  return `reforma:field-view:${projectId}`;
}

export function isFieldViewEntryPath(pathname: string, projectId: string): boolean {
  return pathname === `/projects/${projectId}/today`;
}

export function fieldNavigationSection(
  pathname: string,
  hash: string,
  projectId: string,
): FieldNavigationSection {
  const projectPath = `/projects/${projectId}`;

  if (pathname === `${projectPath}/today`) {
    if (hash === "#attention") return "attention";
    if (hash === "#more") return "more";
    return "today";
  }

  if (pathname === `${projectPath}/visits` || pathname.startsWith(`${projectPath}/visits/`)) {
    return "updates";
  }

  return "more";
}
