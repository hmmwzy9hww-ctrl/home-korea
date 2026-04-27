import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
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
  X,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { ADMIN_PASSWORD } from "@/lib/config";
import { formatWon } from "@/lib/format";
import {
  addListing,
  deleteListing,
  loginAdmin,
  logoutAdmin,
  updateListing,
  updateSiteSettings,
  useAdmin,
  useAnalytics,
  useCitySubscriptions,
  useListings,
  useSiteSettings,
} from "@/lib/store";
import type { City, Listing, ListingStatus, RoomType } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

const cities: City[] = ["seoul", "incheon", "gyeonggi", "busan", "other"];
const roomTypes: RoomType[] = ["oneRoom", "twoRoom", "threeRoom", "officetel", "studio", "share"];

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
  };
}

function createPhotoInputs(photos: string[] = []): string[] {
  return Array.from({ length: 5 }, (_, index) => photos[index] || "");
}

function AdminPage() {
  const { t } = useI18n();
  const isAdmin = useAdmin();
  const listings = useListings();
  const settings = useSiteSettings();
  const analytics = useAnalytics();
  const subs = useCitySubscriptions();
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [editor, setEditor] = useState<EditorState>(null);
  const [form, setForm] = useState<ListingForm>(createEmptyListing());
  const [optionsStr, setOptionsStr] = useState("");
  const [photoInputs, setPhotoInputs] = useState<string[]>(() => createPhotoInputs());
  const [coverDraft, setCoverDraft] = useState(settings.coverImageUrl);

  useEffect(() => {
    setCoverDraft(settings.coverImageUrl);
  }, [settings.coverImageUrl]);

  const editingListing = useMemo(() => {
    if (!editor || editor.mode !== "edit") return undefined;
    return listings.find((listing) => listing.id === editor.id);
  }, [editor, listings]);

  const previewPhotos = useMemo(
    () => photoInputs.map((photo) => photo.trim()).filter(Boolean),
    [photoInputs],
  );

  useEffect(() => {
    if (!editor) return;

    if (editor.mode === "add") {
      setForm(createEmptyListing());
      setOptionsStr("");
      setPhotoInputs(createPhotoInputs());
      return;
    }

    if (!editingListing) {
      setEditor(null);
      return;
    }

    const { id: _id, createdAt: _createdAt, ...rest } = editingListing;
    setForm(rest);
    setOptionsStr(rest.options.join(", "));
    setPhotoInputs(createPhotoInputs(rest.photos));
  }, [editor, editingListing]);

  const setPhotoInput = (index: number, value: string) => {
    setPhotoInputs((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
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

  const saveListing = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const title = form.title.trim();
    if (!title) {
      toast.error(`${t("form.required")}: ${t("form.title")}`);
      return;
    }

    const payload: ListingForm = {
      ...form,
      title,
      area: form.area.trim(),
      address: form.address.trim(),
      floor: form.floor.trim(),
      subwayStation: form.subwayStation.trim(),
      busStop: form.busStop.trim(),
      availableFrom: form.availableFrom.trim(),
      description: form.description.trim(),
      options: optionsStr
        .split(",")
        .map((option) => option.trim())
        .filter(Boolean),
      photos: photoInputs.map((photo) => photo.trim()).filter(Boolean),
      naverMapUrl: "",
      messengerUrl: "",
    };

    if (editor?.mode === "edit" && editingListing) {
      updateListing(editingListing.id, payload);
    } else {
      addListing(payload);
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

                <div className="grid grid-cols-2 gap-3">
                  <Field label={t("form.roomType")}>
                    <select
                      value={form.roomType}
                      onChange={(e) => setForm({ ...form, roomType: e.target.value as RoomType })}
                      className={inputCls}
                    >
                      {roomTypes.map((roomType) => (
                        <option key={roomType} value={roomType}>
                          {t(`room.${roomType}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label={t("form.city")}>
                    <select
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value as City })}
                      className={inputCls}
                    >
                      {cities.map((city) => (
                        <option key={city} value={city}>
                          {t(`city.${city}`)}
                        </option>
                      ))}
                    </select>
                  </Field>
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

                <Field label={t("form.photos")}>
                  <div className="space-y-2">
                    {previewPhotos.length > 0 && (
                      <div className="grid grid-cols-3 gap-2">
                        {previewPhotos.map((photo, index) => (
                          <img
                            key={`${photo}-${index}`}
                            src={photo}
                            alt={`${form.title || t("form.title")}-${index + 1}`}
                            className="aspect-square w-full rounded-lg border bg-muted object-cover"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                    {photoInputs.map((photo, index) => (
                      <input
                        key={index}
                        type="url"
                        value={photo}
                        onChange={(e) => setPhotoInput(index, e.target.value)}
                        placeholder={t("form.photo.ph")}
                        className={inputCls}
                      />
                    ))}
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
