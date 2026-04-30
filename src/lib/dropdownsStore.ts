// Generic store for the four admin-managed dropdown tables:
// room_types, payment_types, floor_options, listing_amenities.
// Mirrors the pattern in citiesStore.ts (Supabase-backed + realtime).
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "./i18n";

export interface DropdownRecord {
  id: string;
  nameMn: string;
  nameKo: string;
  nameEn: string;
  nameRu: string;
  nameZh: string;
  nameVi: string;
  /** Either an emoji string (room/payment/floor) or a Lucide icon name (amenities). */
  icon: string;
  sortOrder: number;
}

type TableName = "room_types" | "payment_types" | "floor_options" | "listing_amenities";

interface StoreState {
  data: DropdownRecord[];
  initialized: boolean;
  loaded: boolean;
  listeners: Set<() => void>;
}

const stores: Record<TableName, StoreState> = {
  room_types:        { data: [], initialized: false, loaded: false, listeners: new Set() },
  payment_types:     { data: [], initialized: false, loaded: false, listeners: new Set() },
  floor_options:     { data: [], initialized: false, loaded: false, listeners: new Set() },
  listing_amenities: { data: [], initialized: false, loaded: false, listeners: new Set() },
};

function rowToRecord(row: Record<string, unknown>, iconKey: "emoji" | "icon"): DropdownRecord {
  return {
    id: String(row.id),
    nameMn: String(row.name_mn ?? ""),
    nameKo: String(row.name_ko ?? ""),
    nameEn: String(row.name_en ?? ""),
    nameRu: String(row.name_ru ?? ""),
    nameZh: String(row.name_zh ?? ""),
    nameVi: String(row.name_vi ?? ""),
    icon: String(row[iconKey] ?? ""),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function recordToRow(r: Partial<DropdownRecord> & { id: string }, iconKey: "emoji" | "icon"): Record<string, unknown> {
  const row: Record<string, unknown> = { id: r.id };
  if (r.nameMn !== undefined) row.name_mn = r.nameMn;
  if (r.nameKo !== undefined) row.name_ko = r.nameKo;
  if (r.nameEn !== undefined) row.name_en = r.nameEn;
  if (r.nameRu !== undefined) row.name_ru = r.nameRu;
  if (r.nameZh !== undefined) row.name_zh = r.nameZh;
  if (r.nameVi !== undefined) row.name_vi = r.nameVi;
  if (r.icon !== undefined) row[iconKey] = r.icon;
  if (r.sortOrder !== undefined) row.sort_order = r.sortOrder;
  return row;
}

function iconKeyFor(table: TableName): "emoji" | "icon" {
  return table === "listing_amenities" ? "icon" : "emoji";
}

function emit(table: TableName) {
  stores[table].listeners.forEach((l) => l());
}

function sortRecords(arr: DropdownRecord[]): DropdownRecord[] {
  return [...arr].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

async function fetchAll(table: TableName) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error(`[${table}] fetch failed`, error);
    return;
  }
  if (data) {
    const ik = iconKeyFor(table);
    stores[table].data = sortRecords((data as Record<string, unknown>[]).map((r) => rowToRecord(r, ik)));
    stores[table].loaded = true;
    emit(table);
  }
}

function ensureInit(table: TableName) {
  const s = stores[table];
  if (s.initialized || typeof window === "undefined") return;
  s.initialized = true;
  void fetchAll(table);
  supabase
    .channel(`${table}-changes`)
    .on("postgres_changes", { event: "*", schema: "public", table }, () => {
      void fetchAll(table);
    })
    .subscribe();
}

function makeHook(table: TableName) {
  const subscribe = (cb: () => void) => {
    stores[table].listeners.add(cb);
    return () => stores[table].listeners.delete(cb);
  };
  const getSnapshot = () => {
    ensureInit(table);
    return stores[table].data;
  };
  const EMPTY: DropdownRecord[] = [];
  const getServer = () => (stores[table].loaded ? stores[table].data : EMPTY);
  return () => useSyncExternalStore(subscribe, getSnapshot, getServer);
}

export const useRoomTypes        = makeHook("room_types");
export const usePaymentTypes     = makeHook("payment_types");
export const useFloorOptions     = makeHook("floor_options");
export const useAmenities        = makeHook("listing_amenities");

/** Localized label for any DropdownRecord. */
export function dropdownLabel(rec: DropdownRecord | undefined, lang: Lang): string {
  if (!rec) return "";
  const map: Record<Lang, string> = {
    mn: rec.nameMn, ko: rec.nameKo, en: rec.nameEn,
    ru: rec.nameRu, zh: rec.nameZh, vi: rec.nameVi,
  };
  return map[lang] || rec.nameEn || rec.nameMn || rec.id;
}

export function findRecord(list: DropdownRecord[], id: string | undefined | null): DropdownRecord | undefined {
  if (!id) return undefined;
  return list.find((r) => r.id === id);
}

// ===== Mutations (admin only — RLS enforces) =====

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `opt-${Date.now().toString(36)}`;
}

function makeMutators(table: TableName) {
  const ik = iconKeyFor(table);

  async function add(input: Omit<DropdownRecord, "sortOrder"> & { sortOrder?: number }) {
    ensureInit(table);
    const s = stores[table];
    const sortOrder = input.sortOrder ?? (s.data.reduce((m, c) => Math.max(m, c.sortOrder), 0) + 1);
    const id = input.id?.trim() || slugify(input.nameEn || input.nameMn || input.nameKo);
    const record: DropdownRecord = { ...input, id, sortOrder };
    s.data = sortRecords([...s.data.filter((c) => c.id !== id), record]);
    emit(table);
    const { error } = await supabase.from(table).insert(recordToRow(record, ik) as never);
    if (error) {
      console.error(`[${table}] insert failed`, error);
      void fetchAll(table);
      throw error;
    }
  }

  async function update(id: string, patch: Partial<Omit<DropdownRecord, "id">>) {
    ensureInit(table);
    const s = stores[table];
    s.data = sortRecords(s.data.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    emit(table);
    const { error } = await supabase
      .from(table)
      .update(recordToRow({ id, ...patch }, ik) as never)
      .eq("id", id);
    if (error) {
      console.error(`[${table}] update failed`, error);
      void fetchAll(table);
      throw error;
    }
  }

  async function remove(id: string) {
    ensureInit(table);
    const s = stores[table];
    const prev = s.data;
    s.data = s.data.filter((c) => c.id !== id);
    emit(table);
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      console.error(`[${table}] delete failed`, error);
      s.data = prev;
      emit(table);
      throw error;
    }
  }

  return { add, update, remove };
}

export const roomTypeMutations    = makeMutators("room_types");
export const paymentTypeMutations = makeMutators("payment_types");
export const floorOptionMutations = makeMutators("floor_options");
export const amenityMutations     = makeMutators("listing_amenities");
