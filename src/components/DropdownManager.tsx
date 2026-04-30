// Generic admin manager for the four DB-backed dropdown tables.
// Used in /admin to CRUD room types, payment types, floor options and amenities.
import { useState, type FormEvent, type ReactNode } from "react";
import { ChevronDown, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  type DropdownRecord,
  roomTypeMutations,
  paymentTypeMutations,
  floorOptionMutations,
  amenityMutations,
  useRoomTypes,
  usePaymentTypes,
  useFloorOptions,
  useAmenities,
} from "@/lib/dropdownsStore";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Kind = "roomTypes" | "paymentTypes" | "floorOptions" | "amenities";

interface Props {
  kind: Kind;
  title: string;
  /** When true, the icon field is a text input (Lucide icon name) instead of an emoji. */
  iconAsText?: boolean;
  iconLabel?: string;
}

type FormShape = {
  id: string;
  icon: string;
  nameMn: string;
  nameKo: string;
  nameEn: string;
  nameRu: string;
  nameZh: string;
  nameVi: string;
};

const empty = (defaultIcon: string): FormShape => ({
  id: "",
  icon: defaultIcon,
  nameMn: "", nameKo: "", nameEn: "", nameRu: "", nameZh: "", nameVi: "",
});

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring";

function useKindData(kind: Kind) {
  // Hooks must be called unconditionally — call all four and pick.
  const room = useRoomTypes();
  const payment = usePaymentTypes();
  const floor = useFloorOptions();
  const amenity = useAmenities();
  switch (kind) {
    case "roomTypes":    return { items: room,    mut: roomTypeMutations,    defaultIcon: "🏠" };
    case "paymentTypes": return { items: payment, mut: paymentTypeMutations, defaultIcon: "💳" };
    case "floorOptions": return { items: floor,   mut: floorOptionMutations, defaultIcon: "" };
    case "amenities":    return { items: amenity, mut: amenityMutations,     defaultIcon: "Sparkles" };
  }
}

export function DropdownManager({ kind, title, iconAsText = false, iconLabel }: Props) {
  const { t } = useI18n();
  const { items, mut, defaultIcon } = useKindData(kind);
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<{ mode: "add" } | { mode: "edit"; id: string } | null>(null);
  const [form, setForm] = useState<FormShape>(empty(defaultIcon));
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setForm(empty(defaultIcon));
    setEditor({ mode: "add" });
  };

  const openEdit = (rec: DropdownRecord) => {
    setForm({
      id: rec.id,
      icon: rec.icon || defaultIcon,
      nameMn: rec.nameMn, nameKo: rec.nameKo, nameEn: rec.nameEn,
      nameRu: rec.nameRu, nameZh: rec.nameZh, nameVi: rec.nameVi,
    });
    setEditor({ mode: "edit", id: rec.id });
  };

  const closeEditor = () => setEditor(null);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nameMn.trim() && !form.nameKo.trim() && !form.nameEn.trim()) {
      toast.error("Нэр шаардлагатай");
      return;
    }
    setSaving(true);
    try {
      if (editor?.mode === "edit") {
        await mut.update(editor.id, {
          icon: form.icon,
          nameMn: form.nameMn, nameKo: form.nameKo, nameEn: form.nameEn,
          nameRu: form.nameRu, nameZh: form.nameZh, nameVi: form.nameVi,
        });
      } else {
        await mut.add({
          id: form.id.trim(),
          icon: form.icon,
          nameMn: form.nameMn, nameKo: form.nameKo, nameEn: form.nameEn,
          nameRu: form.nameRu, nameZh: form.nameZh, nameVi: form.nameVi,
        });
      }
      toast.success(t("form.saved"));
      setEditor(null);
    } catch (err) {
      console.error(err);
      toast.error("Хадгалахад алдаа гарлаа");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (rec: DropdownRecord) => {
    if (!confirm(`Устгах: ${rec.nameMn || rec.nameEn || rec.id}?`)) return;
    try {
      await mut.remove(rec.id);
      toast.success(t("form.deleted"));
    } catch {
      toast.error("Устгахад алдаа гарлаа");
    }
  };

  return (
    <div className="mb-4 rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-3"
      >
        <span className="text-sm font-bold">{title}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {items.length}
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {open && (
        <div className="border-t px-3 py-3">
          <button
            type="button"
            onClick={openAdd}
            className="mb-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t("admin.add")}
          </button>

          <ul className="space-y-2">
            {items.map((rec) => (
              <li
                key={rec.id}
                className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2"
              >
                <span className="text-base shrink-0 min-w-[1.5rem] text-center">
                  {rec.icon || "·"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">
                    {rec.nameMn || rec.nameEn} <span className="text-muted-foreground">/ {rec.nameKo} / {rec.nameEn}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">id: {rec.id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(rec)}
                  className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
                  aria-label={t("admin.edit")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(rec)}
                  className="grid h-8 w-8 place-items-center rounded-full text-destructive hover:bg-destructive/10"
                  aria-label={t("admin.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {items.length === 0 && (
              <li className="py-6 text-center text-xs text-muted-foreground">—</li>
            )}
          </ul>
        </div>
      )}

      {editor && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label={t("form.cancel")}
            onClick={closeEditor}
            className="absolute inset-0 bg-foreground/45"
          />
          <div className="absolute inset-x-0 bottom-0 top-12 flex flex-col rounded-t-3xl border bg-background sm:inset-auto sm:left-1/2 sm:top-10 sm:max-h-[calc(100vh-4rem)] sm:w-[min(34rem,calc(100vw-1.5rem))] sm:-translate-x-1/2 sm:rounded-3xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <h2 className="text-base font-bold">
                {editor.mode === "add" ? t("admin.add") : t("admin.edit")}
              </h2>
              <button
                type="button"
                onClick={closeEditor}
                className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={onSave} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                <div className="grid grid-cols-[6rem_1fr] gap-3">
                  <Field label={iconLabel || (iconAsText ? "Icon" : "Emoji")}>
                    <input
                      type="text"
                      value={form.icon}
                      onChange={(e) => setForm({ ...form, icon: e.target.value })}
                      className={cn(inputCls, !iconAsText && "text-center text-2xl")}
                      maxLength={iconAsText ? 32 : 4}
                      placeholder={iconAsText ? "Snowflake" : ""}
                    />
                  </Field>
                  <Field label="ID" hint={editor.mode === "add" ? "Empty = auto from English name" : undefined}>
                    <input
                      type="text"
                      value={form.id}
                      onChange={(e) => setForm({ ...form, id: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. studio"
                      disabled={editor.mode === "edit"}
                    />
                  </Field>
                </div>

                <Field label="🇲🇳 Монгол">
                  <input type="text" value={form.nameMn} onChange={(e) => setForm({ ...form, nameMn: e.target.value })} className={inputCls} />
                </Field>
                <Field label="🇰🇷 한국어">
                  <input type="text" value={form.nameKo} onChange={(e) => setForm({ ...form, nameKo: e.target.value })} className={inputCls} />
                </Field>
                <Field label="🇬🇧 English">
                  <input type="text" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} className={inputCls} />
                </Field>
                <Field label="🇷🇺 Русский">
                  <input type="text" value={form.nameRu} onChange={(e) => setForm({ ...form, nameRu: e.target.value })} className={inputCls} />
                </Field>
                <Field label="🇨🇳 中文">
                  <input type="text" value={form.nameZh} onChange={(e) => setForm({ ...form, nameZh: e.target.value })} className={inputCls} />
                </Field>
                <Field label="🇻🇳 Tiếng Việt">
                  <input type="text" value={form.nameVi} onChange={(e) => setForm({ ...form, nameVi: e.target.value })} className={inputCls} />
                </Field>
              </div>

              <div className="flex gap-2 border-t bg-background px-4 py-3">
                <button
                  type="button"
                  onClick={closeEditor}
                  className="flex-1 rounded-xl border py-2.5 text-sm font-semibold hover:bg-secondary"
                >
                  {t("form.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {t("form.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
