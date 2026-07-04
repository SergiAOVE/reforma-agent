"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

type VisitTabId = "details" | "evidence" | "review";

interface VisitTabsProps {
  details: ReactNode;
  evidence: ReactNode;
  review: ReactNode;
}

const TABS: { id: VisitTabId; label: string }[] = [
  { id: "details", label: "Details" },
  { id: "evidence", label: "Evidence" },
  { id: "review", label: "Review & publish" },
];

function tabFromHash(hash: string): VisitTabId {
  const cleanHash = hash.replace(/^#/, "");
  if (cleanHash === "evidence" || cleanHash.startsWith("evidence-")) return "evidence";
  if (
    cleanHash === "review" ||
    cleanHash.startsWith("issue-") ||
    cleanHash.startsWith("decision-")
  ) {
    return "review";
  }
  return "details";
}

export function VisitTabs({ details, evidence, review }: VisitTabsProps) {
  const [activeTab, setActiveTab] = useState<VisitTabId>("details");
  const idPrefix = useId();
  const panels: Record<VisitTabId, ReactNode> = { details, evidence, review };

  useEffect(() => {
    const syncTabFromHash = () => {
      const nextTab = tabFromHash(window.location.hash);
      setActiveTab(nextTab);

      window.requestAnimationFrame(() => {
        const targetId = window.location.hash.replace(/^#/, "");
        if (!targetId) return;
        document.getElementById(targetId)?.scrollIntoView({ block: "center" });
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
      <div className="tab-list" role="tablist" aria-label="Visit sections">
        {TABS.map((tab) => {
          const selected = activeTab === tab.id;
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
