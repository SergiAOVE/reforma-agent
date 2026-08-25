"use client";

import { AlertTriangle, ClipboardPenLine, FileText, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import {
  fieldNavigationSection,
  fieldViewStorageKey,
  isFieldViewEntryPath,
} from "../../../lib/field-view";

const ProjectFieldViewContext = createContext<boolean | undefined>(undefined);

function useProjectFieldView(): boolean {
  const value = useContext(ProjectFieldViewContext);
  if (value === undefined) {
    throw new Error("Project field-view components must be rendered inside ProjectViewShell.");
  }
  return value;
}

function FieldNavigation({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, [pathname]);

  const activeSection = fieldNavigationSection(pathname, hash, projectId);
  const todayHref = `/projects/${projectId}/today`;

  return (
    <nav className="operator-bottom-nav" aria-label="Field view navigation">
      <Link href={todayHref} aria-current={activeSection === "today" ? "page" : undefined}>
        <ClipboardPenLine size={20} aria-hidden="true" />
        <span>Today</span>
      </Link>
      <Link
        href={`/projects/${projectId}/visits`}
        aria-current={activeSection === "updates" ? "page" : undefined}
      >
        <FileText size={20} aria-hidden="true" />
        <span>Updates</span>
      </Link>
      <Link
        href={`${todayHref}#attention`}
        aria-current={activeSection === "attention" ? "location" : undefined}
      >
        <AlertTriangle size={20} aria-hidden="true" />
        <span>Attention</span>
      </Link>
      <Link
        href={`${todayHref}#more`}
        aria-current={activeSection === "more" ? "location" : undefined}
      >
        <MoreHorizontal size={20} aria-hidden="true" />
        <span>More</span>
      </Link>
    </nav>
  );
}

export function ProjectViewShell({
  projectId,
  defaultFieldView,
  children,
}: {
  projectId: string;
  defaultFieldView: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const fieldEntry = isFieldViewEntryPath(pathname, projectId);
  const [sessionFieldView, setSessionFieldView] = useState(false);
  const isFieldView = defaultFieldView || fieldEntry || sessionFieldView;

  useEffect(() => {
    try {
      const storageKey = fieldViewStorageKey(projectId);
      const savedFieldView = window.sessionStorage.getItem(storageKey) === "true";

      if (defaultFieldView || fieldEntry) {
        window.sessionStorage.setItem(storageKey, "true");
        setSessionFieldView(true);
        return;
      }

      if (savedFieldView) {
        setSessionFieldView(true);
      }
    } catch {
      // Site Managers and the Today route still work when browser storage is unavailable.
    }
  }, [defaultFieldView, fieldEntry, projectId]);

  return (
    <ProjectFieldViewContext.Provider value={isFieldView}>
      <div className={isFieldView ? "field-view-shell" : undefined}>
        {children}
        {isFieldView ? <FieldNavigation projectId={projectId} /> : null}
      </div>
    </ProjectFieldViewContext.Provider>
  );
}

export function ProjectBackLink({
  projectId,
  fallbackHref,
  fallbackLabel,
}: {
  projectId: string;
  fallbackHref: string;
  fallbackLabel: string;
}) {
  const isFieldView = useProjectFieldView();

  return (
    <Link href={isFieldView ? `/projects/${projectId}/today` : fallbackHref}>
      {"<-"} {isFieldView ? "Today" : fallbackLabel}
    </Link>
  );
}
