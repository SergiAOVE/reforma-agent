import Link from "next/link";

import { loadProjectAccess } from "../../../../lib/project-access";
import {
  createContractItem,
  deleteContractItem,
  importContractItemsCsv,
  updateContractItem,
} from "./actions";

interface BudgetPageProps {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ error?: string; ok?: string }>;
}

function money(value: number | null): string {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function SelectReferences({
  zones,
  trades,
  documents,
  defaults,
  disabled,
}: {
  zones: { id: string; name: string }[];
  trades: { id: string; name: string }[];
  documents: { id: string; title: string }[];
  defaults?: { zoneId?: string | null; tradeId?: string | null; sourceDocumentId?: string | null };
  disabled?: boolean;
}) {
  return (
    <div className="grid three">
      <label className="field">
        <span>Zone</span>
        <select name="zoneId" defaultValue={defaults?.zoneId ?? ""} disabled={disabled}>
          <option value="">None</option>
          {zones.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Trade</span>
        <select name="tradeId" defaultValue={defaults?.tradeId ?? ""} disabled={disabled}>
          <option value="">None</option>
          {trades.map((trade) => (
            <option key={trade.id} value={trade.id}>
              {trade.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>Source document</span>
        <select
          name="sourceDocumentId"
          defaultValue={defaults?.sourceDocumentId ?? ""}
          disabled={disabled}
        >
          <option value="">None</option>
          {documents.map((document) => (
            <option key={document.id} value={document.id}>
              {document.title}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export default async function BudgetPage({ params, searchParams }: BudgetPageProps) {
  const { projectId } = await params;
  const { error, ok } = await searchParams;
  const { supabase, project, role, canEdit } = await loadProjectAccess(projectId);

  const [{ data: items }, { data: zones }, { data: trades }, { data: documents }] =
    await Promise.all([
      supabase
        .from("contract_items")
        .select(
          "id, source_document_id, code, title, description, trade_id, zone_id, quantity, unit, unit_price, total_amount, included_excluded, source_page, notes, zones(name), trades(name), documents(title)",
        )
        .eq("project_id", project.id)
        .order("created_at", { ascending: false }),
      supabase.from("zones").select("id, name").eq("project_id", project.id).order("name"),
      supabase.from("trades").select("id, name").eq("project_id", project.id).order("name"),
      supabase.from("documents").select("id, title").eq("project_id", project.id).order("title"),
    ]);

  const safeItems = items ?? [];
  const safeZones = zones ?? [];
  const safeTrades = trades ?? [];
  const safeDocuments = documents ?? [];
  const total = safeItems.reduce((sum, item) => sum + (item.total_amount ?? 0), 0);

  return (
    <>
      <p>
        <Link href={`/projects/${project.id}`}>← {project.name}</Link>
      </p>
      <div className="page-title">
        <div>
          <h1>Budget items</h1>
          <p className="muted">Manual contract line items and CSV imports.</p>
        </div>
        <div>
          <span className="badge">Total {money(total)}</span>{" "}
          <span className={`badge role-${role}`}>{role}</span>
        </div>
      </div>

      {error ? <p className="notice error">{error}</p> : null}
      {ok ? <p className="notice ok">{ok}</p> : null}
      {!canEdit ? (
        <p className="notice error">
          Your role is read-only here. Owners, admins and editors can change budget items.
        </p>
      ) : null}

      <section className="card">
        <h2>Add budget item</h2>
        <form action={createContractItem} className="compact-form">
          <input type="hidden" name="projectId" value={project.id} />
          <div className="grid two">
            <label className="field">
              <span>Code</span>
              <input name="code" maxLength={240} disabled={!canEdit} />
            </label>
            <label className="field">
              <span>Title</span>
              <input name="title" required maxLength={220} disabled={!canEdit} />
            </label>
          </div>
          <label className="field">
            <span>Description</span>
            <textarea name="description" rows={2} maxLength={2000} disabled={!canEdit} />
          </label>
          <SelectReferences
            zones={safeZones}
            trades={safeTrades}
            documents={safeDocuments}
            disabled={!canEdit}
          />
          <div className="grid three">
            <label className="field">
              <span>Quantity</span>
              <input name="quantity" type="number" step="0.01" min="0" disabled={!canEdit} />
            </label>
            <label className="field">
              <span>Unit</span>
              <input name="unit" maxLength={240} disabled={!canEdit} />
            </label>
            <label className="field">
              <span>Unit price</span>
              <input name="unitPrice" type="number" step="0.01" min="0" disabled={!canEdit} />
            </label>
          </div>
          <div className="grid three">
            <label className="field">
              <span>Total amount</span>
              <input name="totalAmount" type="number" step="0.01" min="0" disabled={!canEdit} />
            </label>
            <label className="field">
              <span>Included/excluded</span>
              <input name="includedExcluded" maxLength={240} disabled={!canEdit} />
            </label>
            <label className="field">
              <span>Source page</span>
              <input name="sourcePage" maxLength={240} disabled={!canEdit} />
            </label>
          </div>
          <label className="field">
            <span>Notes</span>
            <textarea name="notes" rows={2} maxLength={2000} disabled={!canEdit} />
          </label>
          <button type="submit" disabled={!canEdit}>
            Add item
          </button>
        </form>
      </section>

      <section className="card">
        <h2>CSV import</h2>
        <p className="muted">
          Headers: code, title, description, trade, zone, quantity, unit, unit_price, total_amount,
          included_excluded, source_page, notes.
        </p>
        <pre className="code-sample">
          code,title,description,trade,zone,quantity,unit,unit_price,total_amount,included_excluded,source_page,notes
          {"\n"}K01,Kitchen cabinets,Base units,Carpentry,Kitchen,2,unit,1200,2400,included,4,Oak
          finish
        </pre>
        <form action={importContractItemsCsv} encType="multipart/form-data">
          <input type="hidden" name="projectId" value={project.id} />
          <label className="field">
            <span>Attach all imported rows to document</span>
            <select name="sourceDocumentId" disabled={!canEdit}>
              <option value="">None</option>
              {safeDocuments.map((document) => (
                <option key={document.id} value={document.id}>
                  {document.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>CSV file</span>
            <input name="csv" type="file" accept=".csv,text/csv" required disabled={!canEdit} />
          </label>
          <button type="submit" disabled={!canEdit}>
            Import CSV
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Line items</h2>
        {safeItems.length === 0 ? (
          <p className="muted">No budget items yet.</p>
        ) : (
          <ul className="stack-list">
            {safeItems.map((item) => (
              <li key={item.id} className="stack-item">
                <div className="split-row">
                  <div>
                    <strong>
                      {item.code ? `${item.code} · ` : ""}
                      {item.title}
                    </strong>
                    <div className="muted">
                      {item.trades?.name ?? "No trade"} · {item.zones?.name ?? "No zone"} ·{" "}
                      {item.documents?.title ?? "No source document"}
                    </div>
                  </div>
                  <span className="badge">{money(item.total_amount)}</span>
                </div>
                <form action={updateContractItem} className="inline-edit">
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="contractItemId" value={item.id} />
                  <div className="grid two">
                    <label className="field">
                      <span>Code</span>
                      <input name="code" defaultValue={item.code ?? ""} disabled={!canEdit} />
                    </label>
                    <label className="field">
                      <span>Title</span>
                      <input name="title" defaultValue={item.title} required disabled={!canEdit} />
                    </label>
                  </div>
                  <label className="field">
                    <span>Description</span>
                    <textarea
                      name="description"
                      defaultValue={item.description ?? ""}
                      rows={2}
                      disabled={!canEdit}
                    />
                  </label>
                  <SelectReferences
                    zones={safeZones}
                    trades={safeTrades}
                    documents={safeDocuments}
                    defaults={{
                      zoneId: item.zone_id,
                      tradeId: item.trade_id,
                      sourceDocumentId: item.source_document_id,
                    }}
                    disabled={!canEdit}
                  />
                  <div className="grid three">
                    <label className="field">
                      <span>Quantity</span>
                      <input
                        name="quantity"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={item.quantity ?? ""}
                        disabled={!canEdit}
                      />
                    </label>
                    <label className="field">
                      <span>Unit</span>
                      <input name="unit" defaultValue={item.unit ?? ""} disabled={!canEdit} />
                    </label>
                    <label className="field">
                      <span>Unit price</span>
                      <input
                        name="unitPrice"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={item.unit_price ?? ""}
                        disabled={!canEdit}
                      />
                    </label>
                  </div>
                  <div className="grid three">
                    <label className="field">
                      <span>Total amount</span>
                      <input
                        name="totalAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        defaultValue={item.total_amount ?? ""}
                        disabled={!canEdit}
                      />
                    </label>
                    <label className="field">
                      <span>Included/excluded</span>
                      <input
                        name="includedExcluded"
                        defaultValue={item.included_excluded ?? ""}
                        disabled={!canEdit}
                      />
                    </label>
                    <label className="field">
                      <span>Source page</span>
                      <input
                        name="sourcePage"
                        defaultValue={item.source_page ?? ""}
                        disabled={!canEdit}
                      />
                    </label>
                  </div>
                  <label className="field">
                    <span>Notes</span>
                    <textarea
                      name="notes"
                      defaultValue={item.notes ?? ""}
                      rows={2}
                      disabled={!canEdit}
                    />
                  </label>
                  <div className="button-row">
                    <button type="submit" disabled={!canEdit}>
                      Save
                    </button>
                    {canEdit ? (
                      <button type="submit" formAction={deleteContractItem} className="danger">
                        Delete
                      </button>
                    ) : null}
                  </div>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
