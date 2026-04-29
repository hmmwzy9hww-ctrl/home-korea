// Cities store — backed by Supabase `cities` table with realtime sync.
// Cities are managed in the admin panel (City/Area Management section).
import { useSyncExternalStore } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Lang } from "./i18n";

export interface CityRecord {
  id: string;
  nameMn: string;
  nameKo: string;
  nameEn: string;
  nameRu: string;
  nameZh: string;
  nameVi: string;
  emoji: string;
  sortOrder: number;
}

// Built-in fallbacks so the app still renders if the table is empty / loading.
const FALLBACK_CITIES: CityRecord[] = [
  { id: "seoul",   nameMn: "Сөүл",     nameKo: "서울",  nameEn: "Seoul",     nameRu: "Сеул",     nameZh: "首尔",  nameVi: "Seoul",    emoji: "🏙️", sortOrder: 1 },
  { id: "incheon", nameMn: "Инчон",    nameKo: "인천",  nameEn: "Incheon",   nameRu: "Инчхон",   nameZh: "仁川",  nameVi: "Incheon",  emoji: "✈️", sortOrder: 2 },
  { id: "gyeonggi",nameMn: "Кёнгидо",  nameKo: "경기도",nameEn: "Gyeonggi",  nameRu: "Кёнгидо",  nameZh: "京畿道",nameVi: "Gyeonggi", emoji: "🌆", sortOrder: 3 },
  { id: "busan",   nameMn: "Бусан",    nameKo: "부산",  nameEn: "Busan",     nameRu: "Пусан",    nameZh: "釜山",  nameVi: "Busan",    emoji: "🌊", sortOrder: 4 },
  { id: "other",   nameMn: "Бусад",    nameKo: "기타",  nameEn: "Other",     nameRu: "Другое",   nameZh: "其他",  nameVi: "Khác",     emoji: "📍", sortOrder: 5 },
];

let store: CityRecord[] = FALLBACK_CITIES;
let initialized = false;
let loaded = false;
const listeners = new Set<() => void>();

function rowToCity(row: Record<string, unknown>): CityRecord {
  return {
    id: String(row.id),
    nameMn: String(row.name_mn ?? ""),
    nameKo: String(row.name_ko ?? ""),
    nameEn: String(row.name_en ?? ""),
    nameRu: String(row.name_ru ?? ""),
    nameZh: String(row.name_zh ?? ""),
    nameVi: String(row.name_vi ?? ""),
    emoji: String(row.emoji ?? "📍"),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

function cityToRow(c: Partial<CityRecord> & { id: string }): Record<string, unknown> {
  const row: Record<string, unknown> = { id: c.id };
  if (c.nameMn !== undefined) row.name_mn = c.nameMn;
  if (c.nameKo !== undefined) row.name_ko = c.nameKo;
  if (c.nameEn !== undefined) row.name_en = c.nameEn;
  if (c.nameRu !== undefined) row.name_ru = c.nameRu;
  if (c.nameZh !== undefined) row.name_zh = c.nameZh;
  if (c.nameVi !== undefined) row.name_vi = c.nameVi;
  if (c.emoji !== undefined) row.emoji = c.emoji;
  if (c.sortOrder !== undefined) row.sort_order = c.sortOrder;
  return row;
}

function emit() {
  listeners.forEach((l) => l());
}

function sortCities(arr: CityRecord[]): CityRecord[] {
  return [...arr].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

async function fetchAll() {
  const { data, error } = await supabase
    .from("cities")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) {
    console.error("[cities] fetch failed", error);
    return;
  }
  if (data) {
    store = sortCities((data as Record<string, unknown>[]).map(rowToCity));
    loaded = true;
    emit();
  }
}

function ensureInit() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  void fetchAll();
  supabase
    .channel("cities-changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "cities" }, () => {
      void fetchAll();
    })
    .subscribe();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): CityRecord[] {
  ensureInit();
  return store;
}

const SERVER_SNAPSHOT = FALLBACK_CITIES;
function getServerSnapshot(): CityRecord[] {
  return loaded ? store : SERVER_SNAPSHOT;
}

export function useCities(): CityRecord[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/** Return the localized name for a given city id, with sensible fallbacks. */
export function cityLabel(city: CityRecord | undefined, lang: Lang): string {
  if (!city) return "";
  const map: Record<Lang, string> = {
    mn: city.nameMn, ko: city.nameKo, en: city.nameEn,
    ru: city.nameRu, zh: city.nameZh, vi: city.nameVi,
  };
  return map[lang] || city.nameEn || city.nameMn || city.id;
}

/** Look up a city by id from a snapshot. */
export function findCity(cities: CityRecord[], id: string | undefined | null): CityRecord | undefined {
  if (!id) return undefined;
  return cities.find((c) => c.id === id);
}

// ===== Admin mutations =====

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `city-${Date.now().toString(36)}`;
}

export async function addCity(input: Omit<CityRecord, "sortOrder"> & { sortOrder?: number }) {
  ensureInit();
  const sortOrder = input.sortOrder ?? (store.reduce((m, c) => Math.max(m, c.sortOrder), 0) + 1);
  const id = input.id?.trim() || slugify(input.nameEn || input.nameMn || input.nameKo);
  const record: CityRecord = { ...input, id, sortOrder };
  // Optimistic
  store = sortCities([...store.filter((c) => c.id !== id), record]);
  emit();
  const { error } = await supabase.from("cities").insert(cityToRow(record) as never);
  if (error) {
    console.error("[cities] insert failed", error);
    void fetchAll();
    throw error;
  }
}

export async function updateCity(id: string, patch: Partial<Omit<CityRecord, "id">>) {
  ensureInit();
  store = sortCities(store.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  emit();
  const { error } = await supabase
    .from("cities")
    .update(cityToRow({ id, ...patch }) as never)
    .eq("id", id);
  if (error) {
    console.error("[cities] update failed", error);
    void fetchAll();
    throw error;
  }
}

export async function deleteCity(id: string) {
  ensureInit();
  const prev = store;
  store = store.filter((c) => c.id !== id);
  emit();
  const { error } = await supabase.from("cities").delete().eq("id", id);
  if (error) {
    console.error("[cities] delete failed", error);
    store = prev;
    emit();
    throw error;
  }
}
