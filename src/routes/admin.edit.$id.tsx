import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Save, X, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { useI18n } from "@/lib/i18n";
import { useAdmin, useListing, addListing, updateListing } from "@/lib/store";
import type { City, Listing, ListingStatus, RoomType } from "@/lib/types";

export const Route = createFileRoute("/admin/edit/$id")({
  component: EditPage,
});

const cities: City[] = ["seoul", "incheon", "gyeonggi", "busan", "other"];
const roomTypes: RoomType[] = [
  "oneRoom",
  "twoRoom",
  "threeRoom",
  "officetel",
  "studio",
  "share",
  "dorm",
  "twoRoomSeparated",
  "villa",
  "apartment",
  "gosiwon",
];

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
  paymentType: "monthly",
  latitude: null,
  longitude: null,
});

function EditPage() {
  const { t } = useI18n();
  const isAdmin = useAdmin();
  const { id } = Route.useParams();
  const isNew = id === "new";
  const existing = useListing(isNew ? undefined : id);
  const navigate = useNavigate();

  const [form, setForm] = useState<Omit<Listing, "id" | "createdAt">>(empty());
  const [photos, setPhotos] = useState<string[]>([]);
  const [optionsStr, setOptionsStr] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const MAX_PHOTOS = 20;

  useEffect(() => {
    if (!isNew && existing) {
      const { id: _id, createdAt: _c, ...rest } = existing;
      setForm(rest);
      setPhotos(existing.photos.slice(0, MAX_PHOTOS));
      setOptionsStr(existing.options.join(", "));
    } else if (isNew) {
      setForm(empty());
      setPhotos([]);
      setOptionsStr("");
    }
  }, [existing, isNew]);

  const readFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`Max ${MAX_PHOTOS} photos`);
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
    const cleanPhotos = photos.filter(Boolean).slice(0, MAX_PHOTOS);
    const options = optionsStr.split(",").map((o) => o.trim()).filter(Boolean);
    const payload = { ...form, photos: cleanPhotos, options };

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

          <div className="grid grid-cols-2 gap-3">
            <Field label="위도 (Latitude)">
              <input
                type="number"
                step="any"
                value={form.latitude ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, latitude: v === "" ? null : Number(v) });
                }}
                placeholder="예: 37.4633"
                className={inputCls}
              />
            </Field>
            <Field label="경도 (Longitude)">
              <input
                type="number"
                step="any"
                value={form.longitude ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setForm({ ...form, longitude: v === "" ? null : Number(v) });
                }}
                placeholder="예: 126.9001"
                className={inputCls}
              />
            </Field>
          </div>
          <div className="-mt-1 flex flex-wrap items-center gap-2">
            <a
              href={
                form.address || form.area
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${form.address || ""} ${form.area || ""}`.trim())}`
                  : "https://www.google.com/maps"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
            >
              📍 Google Maps에서 좌표 찾기
            </a>
            <a
              href={
                form.address || form.area
                  ? `https://map.kakao.com/?q=${encodeURIComponent(`${form.address || ""} ${form.area || ""}`.trim())}`
                  : "https://map.kakao.com"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-input bg-background px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent"
            >
              🗺️ Kakao Map
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            비워두면 주소로 자동 검색됩니다. 정확하지 않으면 지도에서 핀을 우클릭 → 좌표 복사 후 직접 입력하세요.
            <br />
            Google Maps: 우클릭 시 첫 번째 항목이 (위도, 경도)
          </p>

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

          <Field label={t("form.paymentType")}>
            <select
              value={form.paymentType ?? "monthly"}
              onChange={(e) =>
                setForm({ ...form, paymentType: e.target.value as "monthly" | "quarterly" })
              }
              className={inputCls}
            >
              <option value="monthly">{t("payment.monthly")}</option>
              <option value="quarterly">{t("payment.quarterly")}</option>
            </select>
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
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  void readFiles(e.target.files).catch(() => toast.error(t("form.imageError")));
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || photos.length >= MAX_PHOTOS}
                className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4" />
                {uploading
                  ? "..."
                  : photos.length >= MAX_PHOTOS
                    ? `Max ${MAX_PHOTOS}`
                    : t("form.photo.upload") || "Зураг оруулах"}
              </button>
              {photos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={photo}
                        alt={`${form.title || t("form.title")}-${i + 1}`}
                        className="aspect-square w-full rounded-lg border object-cover bg-muted"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        aria-label="Remove"
                        className="absolute top-1 right-1 inline-flex items-center justify-center h-7 w-7 rounded-full bg-background/90 border shadow-sm text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
