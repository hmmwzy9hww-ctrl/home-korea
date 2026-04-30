import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  X,
  Trash2,
  Plus,
  ExternalLink,
  Languages,
  LogOut,
} from "lucide-react";
import { useAuth, signOut } from "@/hooks/useAuth";
import {
  useListings,
  updateListing,
  deleteListing,
  approveListing,
  rejectListing,
} from "@/lib/store";
import {
  useCities,
  addCity,
  updateCity,
  deleteCity,
  type CityRecord,
} from "@/lib/citiesStore";
import {
  useRoomTypes,
  usePaymentTypes,
  useFloorOptions,
  useAmenities,
  roomTypeMutations,
  paymentTypeMutations,
  floorOptionMutations,
  amenityMutations,
  type DropdownRecord,
} from "@/lib/dropdownsStore";
import { translateDescription } from "@/server/translate.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Гэр Олох" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const navigate = useNavigate();
  const { session, isAdmin, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!session || !isAdmin)) {
      navigate({ to: "/auth" });
    }
  }, [loading, session, isAdmin, navigate]);

  if (loading || !session || !isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="font-bold">Admin Dashboard</h1>
          <span className="ml-auto text-xs text-muted-foreground hidden sm:inline">
            {session.user.email}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
          >
            <LogOut className="h-4 w-4 mr-1" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="listings">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="cities">Cities</TabsTrigger>
            <TabsTrigger value="room_types">Room Types</TabsTrigger>
            <TabsTrigger value="floor_options">Floors</TabsTrigger>
            <TabsTrigger value="payment_types">Payment Types</TabsTrigger>
            <TabsTrigger value="amenities">Amenities</TabsTrigger>
          </TabsList>

          <TabsContent value="listings" className="mt-4">
            <ListingsTab />
          </TabsContent>
          <TabsContent value="cities" className="mt-4">
            <CitiesTab />
          </TabsContent>
          <TabsContent value="room_types" className="mt-4">
            <DropdownTab
              title="Room Types"
              records={useRoomTypes()}
              mutations={roomTypeMutations}
              iconLabel="Emoji"
            />
          </TabsContent>
          <TabsContent value="floor_options" className="mt-4">
            <DropdownTab
              title="Floor Options"
              records={useFloorOptions()}
              mutations={floorOptionMutations}
              iconLabel="Emoji"
            />
          </TabsContent>
          <TabsContent value="payment_types" className="mt-4">
            <DropdownTab
              title="Payment Types"
              records={usePaymentTypes()}
              mutations={paymentTypeMutations}
              iconLabel="Emoji"
            />
          </TabsContent>
          <TabsContent value="amenities" className="mt-4">
            <DropdownTab
              title="Amenities"
              records={useAmenities()}
              mutations={amenityMutations}
              iconLabel="Lucide icon name"
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ============================ LISTINGS TAB ============================ */

function ListingsTab() {
  const listings = useListings();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    "all",
  );
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (filter !== "all" && (l.approvalStatus ?? "approved") !== filter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !l.title.toLowerCase().includes(q) &&
          !l.address.toLowerCase().includes(q) &&
          !l.area.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [listings, filter, search]);

  const pendingCount = listings.filter((l) => l.approvalStatus === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1">
          {(["all", "pending", "approved", "rejected"] as const).map((s) => (
            <Button
              key={s}
              variant={filter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(s)}
            >
              {s}
              {s === "pending" && pendingCount > 0 && (
                <Badge className="ml-2" variant="destructive">
                  {pendingCount}
                </Badge>
              )}
            </Button>
          ))}
        </div>
        <Input
          placeholder="Search title / address…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs ml-auto"
        />
      </div>

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approval</TableHead>
              <TableHead>Rent</TableHead>
              <TableHead>City</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No listings.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="max-w-xs truncate font-medium">
                  {l.title}
                </TableCell>
                <TableCell>
                  <Badge variant={l.status === "available" ? "default" : "secondary"}>
                    {l.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <ApprovalBadge status={l.approvalStatus ?? "approved"} />
                </TableCell>
                <TableCell>{l.monthlyRent.toLocaleString()}</TableCell>
                <TableCell className="text-xs">{l.city}</TableCell>
                <TableCell className="text-right space-x-1 whitespace-nowrap">
                  {l.approvalStatus === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={async () => {
                          await approveListing(l.id);
                          toast.success("Approved");
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await rejectListing(l.id);
                          toast.success("Rejected");
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                  <EditListingDialog listing={l} />
                  <Link
                    to="/listing/$id"
                    params={{ id: l.id }}
                    className="inline-flex items-center justify-center h-8 w-8 rounded-md border hover:bg-accent"
                    title="Open public page"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                  <DeleteConfirm
                    label={l.title}
                    onConfirm={async () => {
                      await deleteListing(l.id);
                      toast.success("Deleted");
                    }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function ApprovalBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") return <Badge variant="default">approved</Badge>;
  if (status === "pending") return <Badge variant="destructive">pending</Badge>;
  return <Badge variant="secondary">rejected</Badge>;
}

function EditListingDialog({ listing }: { listing: ReturnType<typeof useListings>[number] }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(listing.title);
  const [monthlyRent, setMonthlyRent] = useState(listing.monthlyRent);
  const [deposit, setDeposit] = useState(listing.deposit);
  const [maintenanceFee, setMaintenanceFee] = useState(listing.maintenanceFee);
  const [status, setStatus] = useState(listing.status);
  const [featured, setFeatured] = useState(listing.featured);
  const [translating, setTranslating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(listing.title);
      setMonthlyRent(listing.monthlyRent);
      setDeposit(listing.deposit);
      setMaintenanceFee(listing.maintenanceFee);
      setStatus(listing.status);
      setFeatured(listing.featured);
    }
  }, [open, listing]);

  async function onSave() {
    setSaving(true);
    try {
      const patch: Parameters<typeof updateListing>[1] = {
        title,
        monthlyRent,
        deposit,
        maintenanceFee,
        status,
        featured,
      };
      // Auto-translate title to all supported languages if changed
      if (title !== listing.title && title.trim()) {
        try {
          setTranslating(true);
          const trans = await translateDescription({ data: { text: title } });
          patch.titleTranslations = trans;
        } catch (err) {
          console.error("[admin] title translate failed", err);
          toast.error("Title translation failed (saved without translations)");
        } finally {
          setTranslating(false);
        }
      }
      await updateListing(listing.id, patch);
      toast.success("Saved");
      setOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit listing</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            {translating && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Languages className="h-3 w-3" /> Translating to KO/EN/RU/ZH/VI…
              </p>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Rent</Label>
              <Input
                type="number"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Deposit</Label>
              <Input
                type="number"
                value={deposit}
                onChange={(e) => setDeposit(Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Maintenance</Label>
              <Input
                type="number"
                value={maintenanceFee}
                onChange={(e) => setMaintenanceFee(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={status === "available"}
                onChange={(e) => setStatus(e.target.checked ? "available" : "unavailable")}
              />
              Available
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
              />
              Featured
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            Tip: open the public page to inline-edit description, photos, options.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================ CITIES TAB ============================ */

function CitiesTab() {
  const cities = useCities();
  return (
    <MultiLangCrudTable
      title="Cities"
      records={cities}
      iconLabel="Emoji"
      onAdd={(rec) => addCity(rec)}
      onUpdate={(id, patch) => updateCity(id, patch)}
      onDelete={(id) => deleteCity(id)}
    />
  );
}

/* ============================ DROPDOWN TAB ============================ */

function DropdownTab({
  title,
  records,
  mutations,
  iconLabel,
}: {
  title: string;
  records: DropdownRecord[];
  mutations: ReturnType<typeof makeMutationsType>;
  iconLabel: string;
}) {
  return (
    <MultiLangCrudTable
      title={title}
      records={records}
      iconLabel={iconLabel}
      onAdd={(rec) => mutations.add(rec)}
      onUpdate={(id, patch) => mutations.update(id, patch)}
      onDelete={(id) => mutations.remove(id)}
    />
  );
}
// Helper to get the inferred type of mutations objects.
function makeMutationsType() {
  return roomTypeMutations;
}

/* ============================ SHARED MULTI-LANG TABLE ============================ */

type AnyRec = CityRecord | DropdownRecord;

function MultiLangCrudTable({
  title,
  records,
  iconLabel,
  onAdd,
  onUpdate,
  onDelete,
}: {
  title: string;
  records: AnyRec[];
  iconLabel: string;
  onAdd: (rec: Omit<AnyRec, "sortOrder"> & { sortOrder?: number; emoji?: string; icon?: string }) => Promise<void>;
  onUpdate: (id: string, patch: Partial<AnyRec>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<AnyRec> & { iconValue?: string }>({});
  const [adding, setAdding] = useState(false);
  const [newDraft, setNewDraft] = useState<{
    id: string;
    nameMn: string;
    nameKo: string;
    nameEn: string;
    nameRu: string;
    nameZh: string;
    nameVi: string;
    iconValue: string;
  }>({
    id: "",
    nameMn: "",
    nameKo: "",
    nameEn: "",
    nameRu: "",
    nameZh: "",
    nameVi: "",
    iconValue: "",
  });

  function getIcon(r: AnyRec): string {
    if ("emoji" in r) return r.emoji;
    if ("icon" in r) return r.icon;
    return "";
  }

  function startEdit(r: AnyRec) {
    setEditingId(r.id);
    setDraft({ ...r, iconValue: getIcon(r) });
  }

  async function saveEdit() {
    if (!editingId) return;
    const patch: Record<string, unknown> = {
      nameMn: draft.nameMn,
      nameKo: draft.nameKo,
      nameEn: draft.nameEn,
      nameRu: draft.nameRu,
      nameZh: draft.nameZh,
      nameVi: draft.nameVi,
    };
    // Map iconValue back to the right field on the record type
    const target = records.find((r) => r.id === editingId);
    if (target) {
      if ("emoji" in target) patch.emoji = draft.iconValue ?? "";
      else patch.icon = draft.iconValue ?? "";
    }
    try {
      await onUpdate(editingId, patch as Partial<AnyRec>);
      toast.success("Saved");
      setEditingId(null);
    } catch {
      toast.error("Save failed");
    }
  }

  async function saveNew() {
    if (!newDraft.nameMn && !newDraft.nameEn) {
      toast.error("At least one name required");
      return;
    }
    const sample = records[0];
    const useIconField = sample && "icon" in sample;
    const rec: Record<string, unknown> = {
      id: newDraft.id,
      nameMn: newDraft.nameMn,
      nameKo: newDraft.nameKo,
      nameEn: newDraft.nameEn,
      nameRu: newDraft.nameRu,
      nameZh: newDraft.nameZh,
      nameVi: newDraft.nameVi,
    };
    if (useIconField) rec.icon = newDraft.iconValue || "Sparkles";
    else rec.emoji = newDraft.iconValue || "📍";
    try {
      await onAdd(rec as never);
      toast.success("Added");
      setAdding(false);
      setNewDraft({
        id: "",
        nameMn: "",
        nameKo: "",
        nameEn: "",
        nameRu: "",
        nameZh: "",
        nameVi: "",
        iconValue: "",
      });
    } catch {
      toast.error("Add failed");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">{title}</h2>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          <Plus className="h-4 w-4 mr-1" /> {adding ? "Cancel" : "Add"}
        </Button>
      </div>

      {adding && (
        <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <LabeledInput label="ID (slug, optional)" value={newDraft.id} onChange={(v) => setNewDraft({ ...newDraft, id: v })} />
            <LabeledInput label={iconLabel} value={newDraft.iconValue} onChange={(v) => setNewDraft({ ...newDraft, iconValue: v })} />
            <LabeledInput label="Mongolian" value={newDraft.nameMn} onChange={(v) => setNewDraft({ ...newDraft, nameMn: v })} />
            <LabeledInput label="Korean" value={newDraft.nameKo} onChange={(v) => setNewDraft({ ...newDraft, nameKo: v })} />
            <LabeledInput label="English" value={newDraft.nameEn} onChange={(v) => setNewDraft({ ...newDraft, nameEn: v })} />
            <LabeledInput label="Russian" value={newDraft.nameRu} onChange={(v) => setNewDraft({ ...newDraft, nameRu: v })} />
            <LabeledInput label="Chinese" value={newDraft.nameZh} onChange={(v) => setNewDraft({ ...newDraft, nameZh: v })} />
            <LabeledInput label="Vietnamese" value={newDraft.nameVi} onChange={(v) => setNewDraft({ ...newDraft, nameVi: v })} />
          </div>
          <Button size="sm" onClick={saveNew}>Save</Button>
        </div>
      )}

      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{iconLabel.split(" ")[0]}</TableHead>
              <TableHead>ID</TableHead>
              <TableHead>MN</TableHead>
              <TableHead>KO</TableHead>
              <TableHead>EN</TableHead>
              <TableHead>RU</TableHead>
              <TableHead>ZH</TableHead>
              <TableHead>VI</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => {
              const isEditing = editingId === r.id;
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    {isEditing ? (
                      <Input
                        className="h-8 w-16"
                        value={draft.iconValue ?? ""}
                        onChange={(e) => setDraft({ ...draft, iconValue: e.target.value })}
                      />
                    ) : (
                      <span>{getIcon(r)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{r.id}</TableCell>
                  {(["nameMn", "nameKo", "nameEn", "nameRu", "nameZh", "nameVi"] as const).map((k) => (
                    <TableCell key={k}>
                      {isEditing ? (
                        <Input
                          className="h-8 min-w-24"
                          value={(draft[k] as string) ?? ""}
                          onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                        />
                      ) : (
                        (r[k] as string)
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="text-right space-x-1 whitespace-nowrap">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={saveEdit}>Save</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEdit(r)}>Edit</Button>
                        <DeleteConfirm
                          label={(r.nameEn || r.nameMn || r.id)}
                          onConfirm={async () => {
                            try {
                              await onDelete(r.id);
                              toast.success("Deleted");
                            } catch {
                              toast.error("Delete failed");
                            }
                          }}
                        />
                      </>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8" />
    </div>
  );
}

function DeleteConfirm({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <b>{label}</b>. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
