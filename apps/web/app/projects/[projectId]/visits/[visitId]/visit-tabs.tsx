"use client";

import { useId, useState, type ReactNode } from "react";

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

export function VisitTabs({ details, evidence, review }: VisitTabsProps) {
  const [activeTab, setActiveTab] = useState<VisitTabId>("details");
  const idPrefix = useId();
  const panels: Record<VisitTabId, ReactNode> = { details, evidence, review };

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
              onClick={() => setActiveTab(tab.id)}
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
