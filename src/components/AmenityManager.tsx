import { useState } from "react";
import { Pencil, Plus, Trash2, X, Save } from "lucide-react";
import { toast } from "sonner";
import {
  useAmenities,
  upsertAmenity,
  deleteAmenity,
  type AmenityRow,
} from "@/lib/store";
import { AmenityIcon } from "@/components/AmenityIcon";

const EMPTY: AmenityRow = {
  id: "",
  icon: "Sparkles",
  icon_url: "",
  name_mn: "",
  name_ko: "",
  name_en: "",
  name_ru: "",
  name_zh: "",
  name_vi: "",
  sort_order: 0,
};

const MAX_ICON_BYTES = 200_000; // ~200KB after compression

async function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = String(reader.result || "");
      const image = new Image();
      image.onload = () => {
        const maxSide = 128;
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
        // PNG keeps transparency for icons.
        const out = canvas.toDataURL("image/png");
        resolve(out);
      };
      image.onerror = () => resolve(raw);
      image.src = raw;
    };
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export function AmenityManager() {
  const amenities = useAmenities();
  const [editing, setEditing] = useState<AmenityRow | null>(null);
  const [open, setOpen] = useState(false);

  const inputCls =
    "w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30";

  const startAdd = () => {
    const nextOrder = amenities.length
      ? Math.max(...amenities.map((a) => a.sort_order)) + 1
      : 1;
    setEditing({ ...EMPTY, sort_order: nextOrder });
  };

  const save = async () => {
    if (!editing) return;
    const id = editing.id.trim();
    if (!id) {
      toast.error("ID шаардлагатай (жишээ: wifi, parking)");
      return;
    }
    if (!editing.name_mn.trim() && !editing.name_en.trim()) {
      toast.error("Дор хаяж нэг нэр (MN эсвэл EN) бичнэ үү");
      return;
    }
    try {
      await upsertAmenity({ ...editing, id });
      toast.success("Хадгалагдлаа");
      setEditing(null);
    } catch (e) {
      console.error(e);
      toast.error("Хадгалж чадсангүй");
    }
  };

  const remove = async (id: string) => {
    if (!confirm(`"${id}" опцийг устгах уу?`)) return;
    try {
      await deleteAmenity(id);
      toast.success("Устгалаа");
    } catch (e) {
      console.error(e);
      toast.error("Устгаж чадсангүй");
    }
  };

  const onUpload = async (file: File) => {
    if (!editing) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      if (dataUrl.length > MAX_ICON_BYTES * 1.4) {
        toast.error("Файл хэт том байна. 128px орчим жижиг icon оруулна уу.");
        return;
      }
      setEditing({ ...editing, icon_url: dataUrl });
    } catch {
      toast.error("Файлыг уншиж чадсангүй");
    }
  };

  return (
    <div className="rounded-2xl border bg-card p-4 mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-sm font-bold">Опцийн icon-ууд (жишээ нь parking, wifi)</span>
        <span className="text-xs text-muted-foreground">{amenities.length} зүйл</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {amenities.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-xl border bg-background p-2"
              >
                <AmenityIcon iconUrl={a.icon_url} iconName={a.icon} className="h-5 w-5" alt={a.name_mn} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate">{a.name_mn || a.name_en || a.id}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{a.id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(a)}
                  className="p-1 rounded hover:bg-secondary"
                  aria-label="Засах"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  className="p-1 rounded text-destructive hover:bg-destructive/10"
                  aria-label="Устгах"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={startAdd}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Шинэ опц нэмэх
          </button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-background p-4 shadow-card max-h-[90vh] overflow-y-auto">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-bold">Опц засах</h3>
              <button type="button" onClick={() => setEditing(null)} aria-label="Хаах">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <Field label="ID (англиар, давтагдашгүй)">
                <input
                  type="text"
                  value={editing.id}
                  onChange={(e) => setEditing({ ...editing, id: e.target.value.replace(/\s+/g, "") })}
                  placeholder="wifi"
                  className={inputCls}
                />
              </Field>

              <div className="grid grid-cols-2 gap-2">
                <Field label="Icon (lucide нэр)">
                  <input
                    type="text"
                    value={editing.icon}
                    onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                    placeholder="Wifi"
                    className={inputCls}
                  />
                </Field>
                <Field label="Эсвэл icon зураг">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void onUpload(f);
                    }}
                    className="text-xs"
                  />
                </Field>
              </div>

              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-2">
                <span className="text-[11px] text-muted-foreground">Урьдчилан харах:</span>
                <AmenityIcon
                  iconUrl={editing.icon_url}
                  iconName={editing.icon}
                  className="h-6 w-6"
                  alt="preview"
                />
                {editing.icon_url && (
                  <button
                    type="button"
                    onClick={() => setEditing({ ...editing, icon_url: "" })}
                    className="text-[10px] text-destructive hover:underline"
                  >
                    зурaг хаах
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Field label="MN"><input className={inputCls} value={editing.name_mn} onChange={(e) => setEditing({ ...editing, name_mn: e.target.value })} /></Field>
                <Field label="EN"><input className={inputCls} value={editing.name_en} onChange={(e) => setEditing({ ...editing, name_en: e.target.value })} /></Field>
                <Field label="KO"><input className={inputCls} value={editing.name_ko} onChange={(e) => setEditing({ ...editing, name_ko: e.target.value })} /></Field>
                <Field label="RU"><input className={inputCls} value={editing.name_ru} onChange={(e) => setEditing({ ...editing, name_ru: e.target.value })} /></Field>
                <Field label="ZH"><input className={inputCls} value={editing.name_zh} onChange={(e) => setEditing({ ...editing, name_zh: e.target.value })} /></Field>
                <Field label="VI"><input className={inputCls} value={editing.name_vi} onChange={(e) => setEditing({ ...editing, name_vi: e.target.value })} /></Field>
              </div>

              <Field label="Эрэмбэ">
                <input
                  type="number"
                  value={editing.sort_order}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) || 0 })}
                  className={inputCls}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-secondary"
                >
                  Болих
                </button>
                <button
                  type="button"
                  onClick={save}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                >
                  <Save className="h-3.5 w-3.5" /> Хадгалах
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
