import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "src/components/ui/dialog";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { DataTable } from "src/components/shared/DataTable";
import { PageHeader } from "src/components/shared/PageHeader";
import { ConfirmDialog } from "src/components/shared/ConfirmDialog";
import { ErrorState } from "src/components/shared/ErrorState";
import {
  useBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
} from "src/hooks/useBrands";
import type { Brand } from "src/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import { useCategories } from "src/hooks/useCategories";

export default function BrandListPage() {
  const { t } = useTranslation("brands");
  const { t: tc } = useTranslation("common");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState<Brand | null>(null);
  const [deleteCat, setDeleteCat] = useState<Brand | null>(null);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("");
  const [category, setCategory] = useState("");
  const { data: categories } = useCategories();
  const { data: brands, isLoading, isError, refetch } = useBrands();

  const createMut = useCreateBrand(() => {
    setDialogOpen(false);
    setName("");
    setLogo("");
    setCategory("");
  });
  const updateMut = useUpdateBrand(() => {
    setEditCat(null);
    setName("");
    setLogo("");
    setCategory("");
  });
  const deleteMut = useDeleteBrand(() => setDeleteCat(null));

  const columns: ColumnDef<Brand>[] = [
    {
      accessorKey: "_id",
      header: t("columns.id"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {row.original._id}
        </span>
      ),
    },
    { accessorKey: "name", header: t("columns.name") },
    {
      accessorKey: "category",
      header: t("columns.category"),
      cell: ({ row }) => {
        const c = row.original.category;
        return typeof c === "object" ? c.name : "Không có danh mục";
      },
    },
    {
      accessorKey: "logo",
      header: t("columns.logo"),
      cell: ({ row }) => (
        <img
          src={row.original.logo}
          alt={row.original.name}
          className="size-10 rounded-lg"
        />
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("common:aria.editItem", { item: t("brands:title") })}
            onClick={() => {
              setEditCat(row.original);
              setName(row.original.name);
              setLogo(row.original.logo);
              setCategory(
                (row.original.category as { _id: string })?._id || "",
              );
            }}
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            aria-label={t("common:aria.deleteItem", {
              item: t("brands:title"),
            })}
            onClick={() => setDeleteCat(row.original)}
          >
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setDialogOpen(true);
              setName("");
              setLogo("");
            }}
          >
            <Plus className="mr-2 size-4" />
            {t("actions.addBrand")}
          </Button>
        }
      />
      {isError && <ErrorState message={t("error")} onRetry={refetch} />}
      <DataTable
        columns={columns}
        data={brands ?? []}
        isLoading={isLoading}
        searchKey="name"
        searchPlaceholder={t("search")}
      />

      {/* Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("actions.createBrand")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-cat-name">{t("form.name")}</Label>
              <Input
                id="create-cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="create-cat-logo">{t("form.logo")}</Label>
              <Input
                id="create-cat-logo"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-category">{t("form.category")}</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as string)}
                key={category || "__cat__"}
              >
                <SelectTrigger id="product-category" aria-invalid={false}>
                  <SelectValue placeholder={t("form.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => createMut.mutate({ name, logo, category })}
              disabled={!name || createMut.isPending}
            >
              {tc("buttons.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("actions.editBrand")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-name">{t("form.name")}</Label>
              <Input
                id="edit-cat-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-cat-logo">{t("form.logo")}</Label>
              <Input
                id="edit-cat-logo"
                value={logo}
                onChange={(e) => setLogo(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="product-category">{t("form.category")}</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as string)}
                key={category || "__cat__"}
              >
                <SelectTrigger id="product-category" aria-invalid={false}>
                  <SelectValue placeholder={t("form.selectCategory")} />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() =>
                editCat &&
                updateMut.mutate({
                  id: editCat._id,
                  body: { name, logo, category },
                })
              }
              disabled={!name || updateMut.isPending}
            >
              {tc("buttons.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteCat}
        onOpenChange={(o) => !o && setDeleteCat(null)}
        title={t("toast.deleteTitle")}
        description={t("toast.deleteDescription", { name: deleteCat?.name })}
        onConfirm={() => deleteCat && deleteMut.mutate(deleteCat._id)}
        isLoading={deleteMut.isPending}
      />
    </div>
  );
}
