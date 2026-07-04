"use client";

import { type ReactNode, useId, useState } from "react";

type SetupTab = "zones" | "trades";

interface SetupTabsProps {
  zones: ReactNode;
  trades: ReactNode;
  zoneCount: number;
  tradeCount: number;
}

export function SetupTabs({ zones, trades, zoneCount, tradeCount }: SetupTabsProps) {
  const [activeTab, setActiveTab] = useState<SetupTab>("zones");
  const id = useId();
  const tabs = [
    { id: "zones", label: "Zones", count: zoneCount, content: zones },
    { id: "trades", label: "Trades", count: tradeCount, content: trades },
  ] as const;

  return (
    <div className="setup-tabs">
      <div className="tab-list setup-tab-list" role="tablist" aria-label="Project setup sections">
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`${id}-${tab.id}-tab`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${id}-${tab.id}-panel`}
              className={selected ? "tab-button active" : "tab-button"}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label} <span className="tab-count">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`${id}-${tab.id}-panel`}
          role="tabpanel"
          aria-labelledby={`${id}-${tab.id}-tab`}
          hidden={activeTab !== tab.id}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
