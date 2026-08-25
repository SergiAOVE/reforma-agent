"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { Camera, CheckCircle2, MessageSquareText, type LucideIcon } from "lucide-react";

type VisitTabId = "update" | "files" | "finish";

interface VisitTabsProps {
  update: ReactNode;
  files: ReactNode;
  finish: ReactNode;
}

const TABS: { id: VisitTabId; label: string; Icon: LucideIcon }[] = [
  { id: "update", label: "Update", Icon: MessageSquareText },
  { id: "files", label: "Photos & files", Icon: Camera },
  { id: "finish", label: "Finish", Icon: CheckCircle2 },
];

function tabFromHash(hash: string): VisitTabId {
  const cleanHash = hash.replace(/^#/, "");
  if (cleanHash === "files" || cleanHash === "evidence" || cleanHash.startsWith("evidence-")) {
    return "files";
  }
  if (
    cleanHash === "finish" ||
    cleanHash === "review" ||
    cleanHash === "new-issue" ||
    cleanHash === "new-decision" ||
    cleanHash.startsWith("issue-") ||
    cleanHash.startsWith("decision-")
  ) {
    return "finish";
  }
  return "update";
}

export function VisitTabs({ update, files, finish }: VisitTabsProps) {
  const [activeTab, setActiveTab] = useState<VisitTabId>("update");
  const idPrefix = useId();
  const panels: Record<VisitTabId, ReactNode> = { update, files, finish };

  useEffect(() => {
    const syncTabFromHash = () => {
      const nextTab = tabFromHash(window.location.hash);
      setActiveTab(nextTab);

      window.requestAnimationFrame(() => {
        const targetId = window.location.hash.replace(/^#/, "");
        if (!targetId) return;
        const target = document.getElementById(targetId);
        const details = target instanceof HTMLDetailsElement ? target : target?.closest("details");
        if (details instanceof HTMLDetailsElement) {
          details.open = true;
        }
        target?.scrollIntoView({ block: "center" });
      });
    };

    syncTabFromHash();
    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, []);

  const selectTab = (tab: VisitTabId) => {
    setActiveTab(tab);
    window.history.replaceState(null, "", `#${tab}`);
  };

  return (
    <div className="visit-tabs">
      <div className="tab-list visit-step-list" role="tablist" aria-label="Site update steps">
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
          const Icon = tab.Icon;
          return (
            <button
              key={tab.id}
              id={`${idPrefix}-${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${idPrefix}-${tab.id}-panel`}
              className={selected ? "tab-button active" : "tab-button"}
              onClick={() => selectTab(tab.id)}
            >
              <Icon size={18} aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          id={`${idPrefix}-${tab.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${idPrefix}-${tab.id}-tab`}
          hidden={activeTab !== tab.id}
        >
          {panels[tab.id]}
        </div>
      ))}
    </div>
  );
}
