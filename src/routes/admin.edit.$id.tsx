import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAdmin, useListing, addListing, updateListing } from "@/lib/store";
import type { City, Listing, ListingStatus, RoomType } from "@/lib/types";

export const Route = createFileRoute("/admin/edit/$id")({
  component: EditPage,
});

const cities: City[] = ["seoul", "incheon", "gyeonggi", "busan", "other"];
const roomTypes: RoomType[] = ["oneRoom", "twoRoom", "threeRoom", "officetel", "studio", "share"];

const empty = (): Omit<Listing, "id" | "createdAt"> => ({
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
});

function EditPage() {
  const { t } = useI18n();
  const isAdmin = useAdmin();
  const { id } = Route.useParams();
  const isNew = id === "new";
  const existing = useListing(isNew ? undefined : id);
  const navigate = useNavigate();

  const [form, setForm] = useState<Omit<Listing, "id" | "createdAt">>(empty());
  const [photo0, setPhoto0] = useState("");
  const [photo1, setPhoto1] = useState("");
  const [photo2, setPhoto2] = useState("");
  const [photo3, setPhoto3] = useState("");
  const [photo4, setPhoto4] = useState("");
  const [optionsStr, setOptionsStr] = useState("");

  useEffect(() => {
    if (!isNew && existing) {
      const { id: _id, createdAt: _c, ...rest } = existing;
      setForm(rest);
      setPhoto0(existing.photos[0] || "");
      setPhoto1(existing.photos[1] || "");
      setPhoto2(existing.photos[2] || "");
      setPhoto3(existing.photos[3] || "");
      setPhoto4(existing.photos[4] || "");
      setOptionsStr(existing.options.join(", "));
    }
  }, [existing, isNew]);

  if (!isAdmin) {
    return (
      <AppShell showSearch={false}>
        <div className="px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">{t("admin.login.sub")}</p>
          <Link to="/admin" className="mt-4 inline-block text-primary text-sm font-medium">
            {t("admin.login.title")} →
          </Link>
        </div>
      </AppShell>
    );
  }

  const handle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error(t("form.required") + ": " + t("form.title"));
      return;
    }
    const photos = [photo0, photo1, photo2, photo3, photo4].map((p) => p.trim()).filter(Boolean);
    const options = optionsStr.split(",").map((o) => o.trim()).filter(Boolean);
    const payload = { ...form, photos, options };

    if (isNew) {
      addListing(payload);
    } else {
      updateListing(id, payload);
    }
    toast.success(t("form.saved"));
    navigate({ to: "/admin" });
  };

  return (
    <AppShell showSearch={false}>
      <div className="px-4 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Link
            to="/admin"
            aria-label={t("common.back")}
            className="p-2 -ml-2 rounded-lg hover:bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-lg font-bold">{isNew ? t("admin.add") : t("admin.edit")}</h1>
        </div>

        <form onSubmit={handle} className="space-y-4">
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
                {roomTypes.map((r) => (
                  <option key={r} value={r}>{t(`room.${r}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={t("form.city")}>
              <select
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value as City })}
                className={inputCls}
              >
                {cities.map((c) => (
                  <option key={c} value={c}>{t(`city.${c}`)}</option>
                ))}
              </select>
            </Field>
          </div>

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

          <div className="grid grid-cols-3 gap-3">
            <Field label={t("form.monthly")}>
              <input
                type="number"
                value={form.monthlyRent || ""}
                onChange={(e) => setForm({ ...form, monthlyRent: Number(e.target.value) || 0 })}
                className={inputCls}
              />
            </Field>
            <Field label={t("form.deposit")}>
              <input
                type="number"
                value={form.deposit || ""}
                onChange={(e) => setForm({ ...form, deposit: Number(e.target.value) || 0 })}
                className={inputCls}
              />
            </Field>
            <Field label={t("form.maint")}>
              <input
                type="number"
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
              {[
                [photo0, setPhoto0],
                [photo1, setPhoto1],
                [photo2, setPhoto2],
                [photo3, setPhoto3],
                [photo4, setPhoto4],
              ].map(([val, setVal], i) => (
                <input
                  key={i}
                  type="url"
                  value={val as string}
                  onChange={(e) => (setVal as (s: string) => void)(e.target.value)}
                  placeholder={t("form.photo.ph")}
                  className={inputCls}
                />
              ))}
            </div>
          </Field>

          <Field label={t("form.naver")}>
            <input
              type="url"
              value={form.naverMapUrl || ""}
              onChange={(e) => setForm({ ...form, naverMapUrl: e.target.value })}
              placeholder="https://map.naver.com/..."
              className={inputCls}
            />
          </Field>

          <Field label={t("form.messenger")}>
            <input
              type="url"
              value={form.messengerUrl || ""}
              onChange={(e) => setForm({ ...form, messengerUrl: e.target.value })}
              placeholder="https://m.me/..."
              className={inputCls}
            />
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
            <label className="flex items-end gap-2 text-sm pb-2">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              {t("form.featured")}
            </label>
          </div>

          <div className="sticky bottom-16 inset-x-0 bg-background/95 backdrop-blur border-t -mx-4 px-4 py-3 flex gap-2">
            <Link
              to="/admin"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-xl border text-sm font-medium hover:bg-secondary"
            >
              <X className="h-4 w-4" />
              {t("form.cancel")}
            </Link>
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
            >
              <Save className="h-4 w-4" />
              {t("form.save")}
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
