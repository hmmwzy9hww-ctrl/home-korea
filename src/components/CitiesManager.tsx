// Admin City/Area Management panel.
// CRUD over the `cities` table. Names in 6 languages + emoji.
import { useState, type FormEvent } from "react";
import { ChevronDown, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { addCity, deleteCity, updateCity, useCities, type CityRecord } from "@/lib/citiesStore";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Form = {
  id: string;
  emoji: string;
  nameMn: string;
  nameKo: string;
  nameEn: string;
  nameRu: string;
  nameZh: string;
  nameVi: string;
};

const empty = (): Form => ({
  id: "",
  emoji: "📍",
  nameMn: "", nameKo: "", nameEn: "", nameRu: "", nameZh: "", nameVi: "",
});

const inputCls =
  "w-full px-3 py-2 text-sm rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring";

export function CitiesManager() {
  const { t } = useI18n();
  const cities = useCities();
  const [open, setOpen] = useState(false);
  const [editor, setEditor] = useState<{ mode: "add" } | { mode: "edit"; id: string } | null>(null);
  const [form, setForm] = useState<Form>(empty());
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setForm(empty());
    setEditor({ mode: "add" });
  };

  const openEdit = (city: CityRecord) => {
    setForm({
      id: city.id,
      emoji: city.emoji,
      nameMn: city.nameMn, nameKo: city.nameKo, nameEn: city.nameEn,
      nameRu: city.nameRu, nameZh: city.nameZh, nameVi: city.nameVi,
    });
    setEditor({ mode: "edit", id: city.id });
  };

  const closeEditor = () => setEditor(null);

  const onSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nameMn && !form.nameKo && !form.nameEn) {
      toast.error(t("cities.err.name"));
      return;
    }
    setSaving(true);
    try {
      if (editor?.mode === "edit") {
        await updateCity(editor.id, {
          emoji: form.emoji,
          nameMn: form.nameMn, nameKo: form.nameKo, nameEn: form.nameEn,
          nameRu: form.nameRu, nameZh: form.nameZh, nameVi: form.nameVi,
        });
      } else {
        await addCity({
          id: form.id,
          emoji: form.emoji,
          nameMn: form.nameMn, nameKo: form.nameKo, nameEn: form.nameEn,
          nameRu: form.nameRu, nameZh: form.nameZh, nameVi: form.nameVi,
        });
      }
      toast.success(t("form.saved"));
      setEditor(null);
    } catch (err) {
      console.error(err);
      toast.error(t("cities.err.save"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (city: CityRecord) => {
    if (!confirm(t("cities.delete.confirm", { name: city.nameMn || city.nameEn || city.id }))) return;
    try {
      await deleteCity(city.id);
      toast.success(t("form.deleted"));
    } catch {
      toast.error(t("cities.err.delete"));
    }
  };

  return (
    <div className="mb-4 rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-3"
      >
        <span className="text-sm font-bold">{t("cities.title")}</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {cities.length}
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
            {t("cities.add")}
          </button>

          <ul className="space-y-2">
            {cities.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2"
              >
                <span className="text-xl shrink-0">{c.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">
                    {c.nameMn} <span className="text-muted-foreground">/ {c.nameKo} / {c.nameEn}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate">id: {c.id}</div>
                </div>
                <button
                  type="button"
                  onClick={() => openEdit(c)}
                  className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
                  aria-label={t("admin.edit")}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(c)}
                  className="grid h-8 w-8 place-items-center rounded-full text-destructive hover:bg-destructive/10"
                  aria-label={t("admin.delete")}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
            {cities.length === 0 && (
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
                {editor.mode === "add" ? t("cities.add") : t("cities.edit")}
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
                  <Field label={t("cities.field.emoji")}>
                    <input
                      type="text"
                      value={form.emoji}
                      onChange={(e) => setForm({ ...form, emoji: e.target.value })}
                      className={cn(inputCls, "text-center text-2xl")}
                      maxLength={4}
                    />
                  </Field>
                  <Field label="ID" hint={editor.mode === "add" ? t("cities.field.idHint") : undefined}>
                    <input
                      type="text"
                      value={form.id}
                      onChange={(e) => setForm({ ...form, id: e.target.value })}
                      className={inputCls}
                      placeholder="e.g. daejeon"
                      disabled={editor.mode === "edit"}
                    />
                  </Field>
                </div>

                <Field label={`🇲🇳 ${t("cities.field.mn")}`}>
                  <input type="text" value={form.nameMn} onChange={(e) => setForm({ ...form, nameMn: e.target.value })} className={inputCls} required />
                </Field>
                <Field label={`🇰🇷 ${t("cities.field.ko")}`}>
                  <input type="text" value={form.nameKo} onChange={(e) => setForm({ ...form, nameKo: e.target.value })} className={inputCls} />
                </Field>
                <Field label={`🇬🇧 ${t("cities.field.en")}`}>
                  <input type="text" value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} className={inputCls} />
                </Field>
                <Field label={`🇷🇺 ${t("cities.field.ru")}`}>
                  <input type="text" value={form.nameRu} onChange={(e) => setForm({ ...form, nameRu: e.target.value })} className={inputCls} />
                </Field>
                <Field label={`🇨🇳 ${t("cities.field.zh")}`}>
                  <input type="text" value={form.nameZh} onChange={(e) => setForm({ ...form, nameZh: e.target.value })} className={inputCls} />
                </Field>
                <Field label={`🇻🇳 ${t("cities.field.vi")}`}>
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

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[10px] text-muted-foreground">{hint}</span>}
    </label>
  );
}
