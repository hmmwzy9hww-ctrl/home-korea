import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  CheckCircle2,
  Lock,
  LogOut,
  Pencil,
  Plus,
  Save,
  Star,
  StarOff,
  Trash2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useI18n, translate, LANGS, type Lang } from "@/lib/i18n";
import { ADMIN_PASSWORD } from "@/lib/config";
import { formatWon } from "@/lib/format";
import { EDITABLE_TEXTS } from "@/lib/editableTexts";
import {
  addListing,
  cityName,
  deleteListing,
  loginAdmin,
  logoutAdmin,
  roomTypeName,
  setTextOverride,
  translateListingFields,
  updateListing,
  updateSiteSettings,
  useAdmin,
  useAnalytics,
  useCitiesData,
  useCitySubscriptions,
  useListings,
  useRoomTypesData,
  useSiteSettings,
} from "@/lib/store";
import type { City, Listing, ListingStatus, RoomType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AmenityPicker } from "@/components/AmenityPicker";
import { AmenityManager } from "@/components/AmenityManager";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const paymentTypes: { id: string; label: string }[] = [
  { id: "monthly", label: "Сар бүр (월세 / Monthly)" },
  { id: "quarterly", label: "Улирал бүр (전세 / Lump-sum)" },
];

type ListingForm = Omit<Listing, "id" | "createdAt">;
type EditorState = { mode: "add" } | { mode: "edit"; id: string } | null;

function createEmptyListing(): ListingForm {
  return {
    title: "",
    roomType: "oneRoom",
    city: "seoul",
    area: "",
    address: "",
    monthlyRent: 0,
    deposit: 0,
    maintenanceFee: 0,
    maintenanceIncluded: false,
    floor: "",
    size: 0,
    subwayStation: "",
    subwayMinutes: 0,
    busStop: "",
    busMinutes: 0,
    availableFrom: "",
    options: [],
    description: "",
    photos: [],
    naverMapUrl: "",
    messengerUrl: "",
    status: "available",
    featured: false,
    paymentType: "monthly",
  };
}

const MAX_PHOTOS = 20;

function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function AdminPage() {
  const { t, lang } = useI18n();
  const isAdmin = useAdmin();
  const listings = useListings();
  const settings = useSiteSettings();
  const analytics = useAnalytics();
  const subs = useCitySubscriptions();
  const citiesData = useCitiesData();
  const roomTypesData = useRoomTypesData();
  

  const parentCities = useMemo(() => citiesData.filter((c) => !c.parent_id), [citiesData]);
  const childrenByParent = useMemo(() => {
    const map = new Map<string, typeof citiesData>();
    for (const c of citiesData) {
      if (c.parent_id) {
        const arr = map.get(c.parent_id) ?? [];
        arr.push(c);
        map.set(c.parent_id, arr);
      }
    }
    return map;
  }, [citiesData]);

  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [form, setForm] = useState<ListingForm>(createEmptyListing());

  // form.city stores the leaf id (district if present, else parent).
  // Derive selected parent for the current form.city value.
  const selectedCityRow = citiesData.find((c) => c.id === form.city);
  const selectedParentId = selectedCityRow?.parent_id ?? selectedCityRow?.id ?? "";
  const districtOptions = selectedParentId ? (childrenByParent.get(selectedParentId) ?? []) : [];
  const [optionsStr, setOptionsStr] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [coverDraft, setCoverDraft] = useState(settings.coverImageUrl);

  const geocodeAddress = async () => {
    const q = form.address.trim();
    if (!q) {
      toast.error("Хаягаа эхлээд оруулна уу");
      return;
    }
    setGeocoding(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { "Accept-Language": "ko" } });
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!data?.length) {
        toast.error("Байршил олдсонгүй");
        return;
      }
      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);
      setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
      toast.success("Байршил олдлоо");
    } catch (e) {
      console.error(e);
      toast.error("Алдаа гарлаа");
    } finally {
      setGeocoding(false);
    }
  };

  useEffect(() => {
    setCoverDraft((current) => (current === settings.coverImageUrl ? current : settings.coverImageUrl));
  }, [settings.coverImageUrl]);

  const editingListing = useMemo(() => {
    if (!editor || editor.mode !== "edit") return undefined;
    return listings.find((listing) => listing.id === editor.id);
  }, [editor, listings]);

  useEffect(() => {
    if (!editor) return;

    if (editor.mode === "add") {
      setForm((current) => {
        const empty = createEmptyListing();
        return JSON.stringify(current) === JSON.stringify(empty) ? current : empty;
      });
      setOptionsStr((current) => (current === "" ? current : ""));
      setPhotos((current) => (current.length === 0 ? current : []));
      return;
    }

    if (!editingListing) {
      setEditor(null);
      return;
    }

    const { id: _id, createdAt: _createdAt, ...rest } = editingListing;
    setForm((current) => (JSON.stringify(current) === JSON.stringify(rest) ? current : rest));
    setOptionsStr((current) => {
      const next = rest.options.join(", ");
      return current === next ? current : next;
    });
    setPhotos((current) => {
      const next = rest.photos.slice(0, MAX_PHOTOS);
      return arraysEqual(current, next) ? current : next;
    });
  }, [editor, editingListing]);

  const readFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Хамгийн ихдээ ${MAX_PHOTOS} зураг`);
      return;
    }
    const images = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const dataUrls = await Promise.all(
        images.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => {
                const raw = typeof reader.result === "string" ? reader.result : "";
                if (!raw) {
                  resolve("");
                  return;
                }
                const image = new Image();
                image.onload = () => {
                  const maxSide = 1600;
                  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
                  const canvas = document.createElement("canvas");
                  canvas.width = Math.max(1, Math.round(image.width * scale));
                  canvas.height = Math.max(1, Math.round(image.height * scale));
                  const ctx = canvas.getContext("2d");
                  if (!ctx) {
                    resolve(raw);
                    return;
                  }
                  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
                  resolve(canvas.toDataURL("image/jpeg", 0.82));
                };
                image.onerror = () => resolve(raw);
                image.src = raw;
              };
              reader.onerror = () => reject(new Error("read failed"));
              reader.readAsDataURL(file);
            }),
        ),
      );
      setPhotos((prev) => [...prev, ...dataUrls.filter(Boolean)].slice(0, MAX_PHOTOS));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = (i: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== i));
  };

  const closeEditor = () => {
    setEditor(null);
  };

  const openAdd = () => {
    setEditor({ mode: "add" });
  };

  const openEdit = (id: string) => {
    setEditor({ mode: "edit", id });
  };

  const submitLogin = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const ok = loginAdmin(pw, ADMIN_PASSWORD);
    if (!ok) {
      setErr(t("admin.login.wrong"));
      return;
    }
    setPw("");
    setErr("");
  };

  const saveListing = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const title = form.title.trim();
    if (!title) {
      toast.error(`${t("form.required")}: ${t("form.title")}`);
      return;
    }

    const optionsArr = optionsStr
      .split(",")
      .map((option) => option.trim())
      .filter(Boolean);

    const basePayload: ListingForm = {
      ...form,
      title,
      area: form.area.trim(),
      address: form.address.trim(),
      floor: form.floor.trim(),
      subwayStation: form.subwayStation.trim(),
      busStop: form.busStop.trim(),
      availableFrom: form.availableFrom.trim(),
      description: form.description.trim(),
      options: optionsArr,
      photos: photos.filter(Boolean).slice(0, MAX_PHOTOS),
      naverMapUrl: "",
      messengerUrl: "",
      latitude: form.latitude,
      longitude: form.longitude,
      paymentType: form.paymentType || "monthly",
    };

    // Show a toast while we translate so admins know what's happening.
    const translatingToast = toast.loading("Бүх хэл рүү орчуулж байна...");
    let translations: Awaited<ReturnType<typeof translateListingFields>> = {};
    try {
      translations = await translateListingFields({
        sourceLang: "mn",
        fields: {
          title: basePayload.title,
          description: basePayload.description,
          address: basePayload.address,
          area: basePayload.area,
          options: basePayload.options,
        },
      });
      toast.dismiss(translatingToast);
    } catch (err) {
      toast.dismiss(translatingToast);
      console.error(err);
      toast.error(
        "Орчуулга амжилтгүй боллоо. Зар Монгол дээр хадгалагдана.",
      );
    }

    const payload: ListingForm = {
      ...basePayload,
      titleTranslations: translations.titleTranslations,
      descriptionTranslations: translations.descriptionTranslations,
      addressTranslations: translations.addressTranslations,
      areaTranslations: translations.areaTranslations,
      optionsTranslations: translations.optionsTranslations,
    };

    if (editor?.mode === "edit" && editingListing) {
      await updateListing(editingListing.id, payload);
    } else {
      await addListing(payload);
    }

    toast.success(t("form.saved"));
    closeEditor();
  };

  if (!isAdmin) {
    return (
      <AppShell showSearch={false}>
        <div className="px-4 py-10 max-w-sm mx-auto">
          <div className="rounded-3xl border bg-card p-6 shadow-card">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold text-center">{t("admin.login.title")}</h1>
            <p className="mt-1 text-xs text-muted-foreground text-center">{t("admin.login.sub")}</p>
            <form onSubmit={submitLogin} className="mt-5 space-y-3">
              <input
                type="password"
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  setErr("");
                }}
                placeholder={t("admin.login.password")}
                className="w-full px-4 py-2.5 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              {err && <p className="text-xs text-destructive">{err}</p>}
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
              >
                {t("admin.login.submit")}
              </button>
            </form>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showSearch={false}>
      <div className="px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">{t("admin.title")}</h1>
          <button
            type="button"
            onClick={() => {
              logoutAdmin();
              toast.success("Гарлаа");
            }}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs hover:bg-secondary"
          >
            <LogOut className="h-3.5 w-3.5" />
            {t("admin.logout")}
          </button>
        </div>

        {/* Analytics dashboard */}
        <AnalyticsPanel listings={listings} analytics={analytics} subs={subs} />

        {/* Cover image setting */}
        <div className="mb-4 rounded-2xl border bg-card p-3">
          <h2 className="text-sm font-bold mb-2">{t("admin.cover.title")}</h2>
          {coverDraft && (
            <div className="mb-2 overflow-hidden rounded-xl border bg-muted aspect-[16/9]">
              <img
                src={coverDraft}
                alt="cover"
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          <input
            type="url"
            value={coverDraft}
            onChange={(e) => setCoverDraft(e.target.value)}
            placeholder="https://…"
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => {
              updateSiteSettings({ coverImageUrl: coverDraft.trim() });
              toast.success(t("form.saved"));
            }}
            className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {t("admin.cover.save")}
          </button>
        </div>

        {/* Editable site texts */}
        <TextEditor settings={settings} />

        <button
          type="button"
          onClick={openAdd}
          className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {t("admin.add")}
        </button>

        <ul className="space-y-2.5">
          {listings.map((listing) => (
            <li key={listing.id} className="overflow-hidden rounded-2xl border bg-card">
              <div className="flex gap-3 p-3">
                <img
                  src={listing.photos[0] || "https://placehold.co/200x200?text=No"}
                  alt={listing.title}
                  className="h-20 w-20 shrink-0 rounded-xl bg-muted object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 flex items-center gap-1.5">
                    {listing.featured && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
                    <span
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                        listing.status === "available"
                          ? "bg-success/15 text-success"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {listing.status === "available" ? t("card.available") : t("card.unavailable")}
                    </span>
                  </div>
                  <h2 className="line-clamp-1 text-sm font-semibold">{listing.title || "-"}</h2>
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {[t(`city.${listing.city}`), listing.area || listing.address].filter(Boolean).join(" · ") || "-"}
                  </p>
                  <p className="mt-1 text-xs font-bold">{formatWon(listing.monthlyRent)}</p>
                </div>
              </div>
              <div className="grid grid-cols-4 divide-x border-t">
                <button
                  type="button"
                  onClick={() => openEdit(listing.id)}
                  className="inline-flex items-center justify-center gap-1 py-2.5 text-xs font-medium hover:bg-secondary"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t("admin.edit")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateListing(listing.id, {
                      status: listing.status === "available" ? "unavailable" : "available",
                    });
                    toast.success(t("form.saved"));
                  }}
                  className="inline-flex items-center justify-center gap-1 py-2.5 text-xs font-medium hover:bg-secondary"
                >
                  {listing.status === "available" ? (
                    <>
                      <XCircle className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">{t("admin.markUnavailable")}</span>
                      <span className="xs:hidden">{t("card.unavailable")}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="hidden xs:inline">{t("admin.markAvailable")}</span>
                      <span className="xs:hidden">{t("card.available")}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateListing(listing.id, { featured: !listing.featured });
                    toast.success(t("form.saved"));
                  }}
                  className="inline-flex items-center justify-center gap-1 py-2.5 text-xs font-medium hover:bg-secondary"
                >
                  {listing.featured ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                  {t("card.featured")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm(t("admin.delete.confirm"))) return;
                    deleteListing(listing.id);
                    toast.success(t("form.deleted"));
                    if (editor?.mode === "edit" && editor.id === listing.id) {
                      closeEditor();
                    }
                  }}
                  className="inline-flex items-center justify-center gap-1 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("admin.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {editor && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label={t("form.cancel")}
            onClick={closeEditor}
            className="absolute inset-0 bg-foreground/45"
          />
          <div className="absolute inset-x-0 bottom-0 top-8 flex flex-col rounded-t-3xl border bg-background sm:inset-auto sm:left-1/2 sm:top-6 sm:max-h-[calc(100vh-3rem)] sm:w-[min(42rem,calc(100vw-1.5rem))] sm:-translate-x-1/2 sm:rounded-3xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-base font-bold">{editor.mode === "add" ? t("admin.add") : t("admin.edit")}</h2>
              <button
                type="button"
                onClick={closeEditor}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={saveListing} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
                <Field label={t("form.title")}>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder={t("form.title.ph")}
                    className={inputCls}
                    required
                  />
                </Field>

                <div className="grid grid-cols-1 gap-3">
                  <Field label={t("form.roomType")}>
                    <select
                      value={form.roomType}
                      onChange={(e) => setForm({ ...form, roomType: e.target.value as RoomType })}
                      className={inputCls}
                    >
                      {roomTypesData.map((rt) => (
                        <option key={rt.id} value={rt.id}>
                          {rt.emoji ? `${rt.emoji} ` : ""}{roomTypeName(rt, lang)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label={t("form.city")}>
                      <select
                        value={selectedParentId}
                        onChange={(e) => {
                          const parentId = e.target.value;
                          // If chosen parent has districts, keep the parent as form.city until user picks a district.
                          setForm({ ...form, city: parentId as City });
                        }}
                        className={inputCls}
                      >
                        <option value="">—</option>
                        {parentCities.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.emoji ? `${c.emoji} ` : ""}{cityName(c, lang)}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label={lang === "ko" ? "구/군" : "Дүүрэг (구)"}>
                      <select
                        value={selectedCityRow?.parent_id ? form.city : ""}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            city: (e.target.value || selectedParentId) as City,
                          })
                        }
                        className={inputCls}
                        disabled={districtOptions.length === 0}
                      >
                        <option value="">
                          {districtOptions.length === 0 ? "—" : (lang === "ko" ? "전체" : "Бүгд")}
                        </option>
                        {districtOptions.map((d) => (
                          <option key={d.id} value={d.id}>
                            {cityName(d, lang)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </div>


                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("form.area")}>
                    <input
                      type="text"
                      value={form.area}
                      onChange={(e) => setForm({ ...form, area: e.target.value })}
                      placeholder={t("form.area.ph")}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t("form.address")}>
                    <input
                      type="text"
                      value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-[1fr_1fr_auto] gap-3 items-end">
                  <Field label="Latitude">
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={form.latitude ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          latitude: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      placeholder="37.5665"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Longitude">
                    <input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      value={form.longitude ?? ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          longitude: e.target.value === "" ? undefined : Number(e.target.value),
                        })
                      }
                      placeholder="126.9780"
                      className={inputCls}
                    />
                  </Field>
                  <button
                    type="button"
                    onClick={geocodeAddress}
                    disabled={geocoding}
                    className="h-10 rounded-xl border bg-secondary px-3 text-sm font-medium hover:bg-secondary/80 disabled:opacity-50"
                  >
                    {geocoding ? "..." : "📍 Хаягаас авах"}
                  </button>
                </div>

                <Field label="Төлбөрийн төрөл (Payment type)">
                  <select
                    value={form.paymentType ?? "monthly"}
                    onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
                    className={inputCls}
                  >
                    {paymentTypes.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-3 gap-3">
                  <Field label={t("form.monthly")}>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.monthlyRent || ""}
                      onChange={(e) => setForm({ ...form, monthlyRent: Number(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t("form.deposit")}>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.deposit || ""}
                      onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t("form.maint")}>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.maintenanceFee || ""}
                      onChange={(e) => setForm({ ...form, maintenanceFee: Number(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!form.maintenanceIncluded}
                    onChange={(e) => setForm({ ...form, maintenanceIncluded: e.target.checked })}
                    className="h-4 w-4 accent-primary"
                  />
                  {t("filter.maintIncluded")}
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("form.floor")}>
                    <input
                      type="text"
                      value={form.floor}
                      onChange={(e) => setForm({ ...form, floor: e.target.value })}
                      placeholder="3/5"
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t("form.size")}>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={form.size || ""}
                      onChange={(e) => setForm({ ...form, size: Number(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("form.subway")}>
                    <input
                      type="text"
                      value={form.subwayStation}
                      onChange={(e) => setForm({ ...form, subwayStation: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t("form.subwayMin")}>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.subwayMinutes || ""}
                      onChange={(e) => setForm({ ...form, subwayMinutes: Number(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t("form.bus")}>
                    <input
                      type="text"
                      value={form.busStop}
                      onChange={(e) => setForm({ ...form, busStop: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label={t("form.busMin")}>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={form.busMinutes || ""}
                      onChange={(e) => setForm({ ...form, busMinutes: Number(e.target.value) || 0 })}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Field label={t("form.availableFrom")}>
                  <input
                    type="date"
                    value={form.availableFrom}
                    onChange={(e) => setForm({ ...form, availableFrom: e.target.value })}
                    className={inputCls}
                  />
                </Field>

                <Field label={t("form.options")}>
                  <input
                    type="text"
                    value={optionsStr}
                    onChange={(e) => setOptionsStr(e.target.value)}
                    placeholder={t("form.options.ph")}
                    className={inputCls}
                  />
                </Field>

                <Field label={t("form.description")}>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder={t("form.description.ph")}
                    rows={4}
                    className={inputCls}
                  />
                </Field>

                <Field label={`${t("form.photos")} (${photos.length}/${MAX_PHOTOS})`}>
                  <div className="space-y-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => readFiles(e.target.files)}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || photos.length >= MAX_PHOTOS}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed bg-secondary/40 py-3 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      {uploading
                        ? "..."
                        : photos.length >= MAX_PHOTOS
                          ? `Хамгийн ихдээ ${MAX_PHOTOS}`
                          : "Зураг оруулах"}
                    </button>
                    {photos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {photos.map((photo, i) => (
                          <div key={i} className="relative">
                            <img
                              src={photo}
                              alt={`photo-${i + 1}`}
                              className="aspect-square w-full rounded-lg border bg-muted object-cover"
                              loading="lazy"
                            />
                            <button
                              type="button"
                              onClick={() => removePhoto(i)}
                              className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-foreground/70 text-background hover:bg-foreground"
                              aria-label="remove"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("form.status")}>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value as ListingStatus })}
                      className={inputCls}
                    >
                      <option value="available">{t("card.available")}</option>
                      <option value="unavailable">{t("card.unavailable")}</option>
                    </select>
                  </Field>
                  <label className="flex items-end gap-2 pb-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      className="h-4 w-4 accent-primary"
                    />
                    {t("form.featured")}
                  </label>
                </div>
              </div>

              <div className="flex gap-2 border-t bg-background px-4 py-3">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-medium hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                  {t("form.cancel")}
                </button>
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Save className="h-4 w-4" />
                  {t("form.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}

const inputCls =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

function AnalyticsPanel({
  listings,
  analytics,
  subs,
}: {
  listings: Listing[];
  analytics: { views: Record<string, number>; saves: Record<string, number> };
  subs: Set<string>;
}) {
  const { t } = useI18n();
  const totalViews = Object.values(analytics.views).reduce((a, b) => a + b, 0);
  const totalSaves = Object.values(analytics.saves).reduce((a, b) => a + b, 0);

  // City interest = sum of views per listing aggregated by city.
  const cityInterest: Record<string, number> = {};
  for (const l of listings) {
    cityInterest[l.city] = (cityInterest[l.city] || 0) + (analytics.views[l.id] || 0);
  }
  const cityList: City[] = ["seoul", "incheon", "gyeonggi", "busan", "other"];

  // Sort listings by views desc for the per-listing table.
  const sorted = [...listings].sort(
    (a, b) => (analytics.views[b.id] || 0) - (analytics.views[a.id] || 0),
  );

  return (
    <div className="mb-4 rounded-2xl border bg-card p-3">
      <h2 className="mb-3 text-sm font-bold">{t("admin.analytics.title")}</h2>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-accent p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("admin.analytics.totalViews")}
          </div>
          <div className="mt-0.5 text-xl font-bold">{totalViews}</div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-accent p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("admin.analytics.totalSaves")}
          </div>
          <div className="mt-0.5 text-xl font-bold">{totalSaves}</div>
        </div>
        <div className="rounded-xl border bg-gradient-to-br from-primary/10 to-accent p-2.5">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {t("admin.analytics.subscribers")}
          </div>
          <div className="mt-0.5 text-xl font-bold">{subs.size}</div>
        </div>
      </div>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("admin.analytics.cityInterest")}
      </h3>
      <ul className="mt-2 space-y-1.5">
        {cityList.map((c) => {
          const v = cityInterest[c] || 0;
          const sub = subs.has(c);
          const max = Math.max(1, ...cityList.map((x) => cityInterest[x] || 0));
          const pct = Math.round((v / max) * 100);
          return (
            <li key={c} className="text-xs">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t(`city.${c}`)}</span>
                <span className="text-muted-foreground">
                  {v} {t("admin.analytics.views")}
                  {sub && " · 🔔"}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("admin.analytics.byListing")}
      </h3>
      <ul className="mt-2 divide-y rounded-xl border">
        {sorted.slice(0, 8).map((l) => (
          <li key={l.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
            <span className="min-w-0 flex-1 truncate font-medium">{l.title || "-"}</span>
            <span className="whitespace-nowrap text-muted-foreground">
              👁 {analytics.views[l.id] || 0} · ❤ {analytics.saves[l.id] || 0}
            </span>
          </li>
        ))}
        {sorted.length === 0 && (
          <li className="px-3 py-3 text-center text-xs text-muted-foreground">—</li>
        )}
      </ul>
    </div>
  );
}

// ===== Editable site text panel =====
function TextEditor({ settings }: { settings: ReturnType<typeof useSiteSettings> }) {
  const { lang: currentLang } = useI18n();
  const [editLang, setEditLang] = useState<Lang>(currentLang);
  const [open, setOpen] = useState(false);

  // Group editable items by their group label
  const groups = useMemo(() => {
    const map = new Map<string, typeof EDITABLE_TEXTS>();
    for (const item of EDITABLE_TEXTS) {
      const arr = map.get(item.group) || [];
      arr.push(item);
      map.set(item.group, arr);
    }
    return Array.from(map.entries());
  }, []);

  const overrides = settings.textOverrides?.[editLang] || {};

  return (
    <div className="mb-4 rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between p-3 text-left"
      >
        <span className="text-sm font-bold">Site texts (editable)</span>
        <span className="text-xs text-muted-foreground">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="border-t p-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {LANGS.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setEditLang(l.code)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs",
                  editLang === l.code
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "hover:bg-secondary",
                )}
              >
                {l.flag} {l.label}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Leave a field empty to use the default text. Saved overrides apply instantly to all visitors on this device.
          </p>

          {groups.map(([groupName, items]) => (
            <div key={groupName} className="rounded-xl border bg-background p-2">
              <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {groupName}
              </h4>
              <div className="space-y-2">
                {items.map((item) => (
                  <TextRow
                    key={item.key}
                    item={item}
                    lang={editLang}
                    initialValue={overrides[item.key] ?? ""}
                    placeholder={translate(editLang, item.key)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TextRow({
  item,
  lang,
  initialValue,
  placeholder,
}: {
  item: (typeof EDITABLE_TEXTS)[number];
  lang: Lang;
  initialValue: string;
  placeholder: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [saved, setSaved] = useState(false);

  // Reset value when switching languages
  useEffect(() => {
    setValue(initialValue);
    setSaved(false);
  }, [initialValue, lang]);

  const dirty = value !== initialValue;

  const save = () => {
    setTextOverride(lang, item.key, value);
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <div>
      <label className="mb-0.5 block text-[11px] font-medium text-muted-foreground">
        {item.label} <span className="font-mono opacity-60">· {item.key}</span>
      </label>
      <div className="flex items-start gap-1.5">
        {item.multiline ? (
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="flex-1 rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-lg border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}
        <button
          type="button"
          onClick={save}
          disabled={!dirty && !saved}
          className={cn(
            "shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
            saved
              ? "bg-success/15 text-success"
              : dirty
                ? "bg-primary text-primary-foreground hover:opacity-90"
                : "bg-muted text-muted-foreground",
          )}
        >
          {saved ? "✓" : "Save"}
        </button>
      </div>
    </div>
  );
}
