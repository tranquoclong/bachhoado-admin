import { useEffect, useCallback, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  ImageIcon,
  Tag,
  Layers,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import { Textarea } from "src/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "src/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "src/components/ui/collapsible";
import { PageHeader } from "src/components/shared/PageHeader";
import { LoadingState } from "src/components/shared/LoadingState";
import {
  useProductFormData,
  useCreateProduct,
  useUpdateProduct,
} from "src/hooks/useProductForm";
import { useCategories } from "src/hooks/useCategories";
import { useBrands } from "src/hooks/useBrands";

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const variantOptionSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  image: z.string().optional(),
});

const variantSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  options: z.array(variantOptionSchema).min(1),
  _open: z.boolean().optional(),
});

const skuSchema = z.object({
  value: z.string().min(1),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  image: z.string().optional(),
  variant_values: z.record(z.string(), z.string()).optional(),
});

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0),
  price_before_discount: z.number().min(0).optional(),
  quantity: z.number().int().min(0),
  category: z.string().min(1, "Category is required"),
  brand: z.string().min(1, "Brand is required"),
  image: z.string().min(1, "Image URL is required"),
  images: z.array(z.object({ url: z.string().min(1) })).optional(),
  location: z.string().optional(),
  variants: z.array(variantSchema).optional(),
  skus: z.array(skuSchema).optional(),
});

type FormData = z.infer<typeof schema>;

// ─── SKU generation helper ────────────────────────────────────────────────────

function generateSKUsFromVariants(
  variants: FormData["variants"],
  basePrice: number,
): NonNullable<FormData["skus"]> {
  if (!variants || variants.length === 0) return [];

  const combos: Array<Record<string, string>> = [{}];
  for (const variant of variants) {
    const next: Array<Record<string, string>> = [];
    for (const existing of combos) {
      for (const option of variant.options) {
        if (option.value) {
          next.push({
            ...existing,
            [variant.type || variant.name]: option.value,
          });
        }
      }
    }
    if (next.length > 0) combos.splice(0, combos.length, ...next);
  }

  return combos.map((combo) => ({
    value: Object.values(combo).join("-"),
    price: basePrice,
    stock: 0,
    image: "",
    variant_values: combo,
  }));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: React.ElementType;
  title: string;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-muted-foreground" />
          {title}
          {badge !== undefined && badge > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {badge}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProductFormPage() {
  const { t } = useTranslation("products");
  const { t: tc } = useTranslation("common");
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();

  const { data: product, isLoading } = useProductFormData(id);
  const { data: categories } = useCategories();
  const { data: brands } = useBrands();
  const createMut = useCreateProduct(() => navigate("/products"));
  const updateMut = useUpdateProduct(() => navigate("/products"));

  // Stores a JSON snapshot of variants as received from the server.
  // SKU regeneration compares current watchedVariants against this snapshot:
  // equal → user hasn't changed variants yet → skip regeneration (preserve server SKUs).
  // different → user edited a variant → regenerate.
  const loadedVariantsSnapshot = useRef<string>("");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { images: [], variants: [], skus: [] },
  });

  const {
    fields: imageFields,
    append: appendImage,
    remove: removeImage,
  } = useFieldArray({ control, name: "images" });

  const {
    fields: variantFields,
    append: appendVariant,
    remove: removeVariant,
    update: updateVariant,
  } = useFieldArray({ control, name: "variants" });

  const { fields: skuFields, replace: replaceSkus } = useFieldArray({
    control,
    name: "skus",
  });

  const watchedVariants = watch("variants");
  const watchedPrice = watch("price");

  const regenerateSkus = useCallback(() => {
    replaceSkus(generateSKUsFromVariants(watchedVariants, watchedPrice ?? 0));
  }, [watchedVariants, watchedPrice, replaceSkus]);

  // SKU regeneration effect.
  // Create mode: always regenerate on variant change.
  // Edit mode: only regenerate when watchedVariants diverges from server snapshot,
  //   meaning the user actually changed something (not just initial populate).
  useEffect(() => {
    if (isEdit) {
      const currentJson = JSON.stringify(watchedVariants);
      if (currentJson === loadedVariantsSnapshot.current) return;
    }
    regenerateSkus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(watchedVariants), isEdit]);

  // Populate form from fetched product (edit mode).
  //
  // KEY FIX: also depend on `categories` and `brands`.
  // shadcn <Select> requires its options to already exist in the DOM for `value`
  // to match and display correctly. If we call setValue('category', id) before
  // the categories list has loaded, the Select renders with no matching option
  // and shows the placeholder instead.
  // By waiting for all three (product + categories + brands) we guarantee the
  // options are rendered before we set the selected value.
  useEffect(() => {
    if (!product || !categories?.length || !brands?.length) return;

    setValue("name", product.name);
    setValue("description", product.description || "");
    setValue("price", product.price);
    setValue("price_before_discount", product.price_before_discount);
    setValue("quantity", product.quantity);
    setValue(
      "category",
      typeof product.category === "object"
        ? product.category._id
        : product.category,
    );
    setValue(
      "brand",
      typeof product.brand === "object" ? product.brand._id : product.brand,
    );
    setValue("image", product.image);
    setValue("location", product.location || "");

    if (product.images?.length) {
      setValue(
        "images",
        product.images.map((url: string) => ({ url })),
      );
    }

    // Normalize variants and store snapshot BEFORE setValue so the SKU
    // regeneration effect sees the snapshot synchronously when it fires.
    const normalizedVariants = product.variants?.length
      ? product.variants.map((v: any) => ({
          name: v.name,
          type: v.type,
          options: v.options.map((o: any) => ({
            name: o.name,
            value: o.value,
            image: o.image,
          })),
          _open: false,
        }))
      : [];

    loadedVariantsSnapshot.current = JSON.stringify(normalizedVariants);

    if (normalizedVariants.length) {
      setValue("variants", normalizedVariants);
    }

    // Strip backend-only fields. Backend upserts SKUs by `value`, _id not needed.
    if ((product as any).skus?.length) {
      setValue(
        "skus",
        (product as any).skus.map((s: any) => ({
          value: s.value,
          price: s.price,
          stock: s.stock,
          image: s.image ?? "",
          variant_values: s.variant_values ?? {},
        })),
      );
    }
  }, [product, categories, brands, setValue]);

  const onSubmit = (data: FormData) => {
    const payload = {
      ...data,
      price: Number(data.price),
      price_before_discount:
        data.price_before_discount != null
          ? Number(data.price_before_discount)
          : undefined,
      quantity: Number(data.quantity),
      images: data.images?.map((i) => i.url).filter((u): u is string => !!u),
      variants: data.variants?.map(({ _open, ...v }) => v),
      skus: data.skus?.length
        ? data.skus.map((s) => ({
            value: s.value,
            price: Number(s.price),
            stock: Number(s.stock),
            image: s.image || undefined,
            variant_values: s.variant_values,
          }))
        : undefined,
    };
    isEdit
      ? updateMut.mutate({ id: id!, data: payload })
      : createMut.mutate(payload);
  };

  const isPending = createMut.isPending || updateMut.isPending;

  if (isEdit && isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? t("form.editProduct") : t("form.newProduct")}
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Basic Info ── */}
        <SectionCard icon={Tag} title={t("form.productDetails")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="product-name">{t("form.name")}</Label>
              <Input
                id="product-name"
                {...register("name")}
                aria-invalid={!!errors.name}
                aria-describedby={
                  errors.name ? "product-name-error" : undefined
                }
              />
              {errors.name && (
                <p
                  id="product-name-error"
                  className="mt-1 text-xs text-destructive"
                >
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="product-description">
                {t("form.description")}
              </Label>
              <Textarea
                id="product-description"
                {...register("description")}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="product-price">{t("form.price")}</Label>
              <Input
                id="product-price"
                type="number"
                step="any"
                {...register("price", { valueAsNumber: true })}
                aria-invalid={!!errors.price}
              />
              {errors.price && (
                <p className="mt-1 text-xs text-destructive">
                  {errors.price.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="product-price-before">
                {t("form.priceBeforeDiscount")}
              </Label>
              <Input
                id="product-price-before"
                type="number"
                step="any"
                {...register("price_before_discount", { valueAsNumber: true })}
              />
            </div>

            <div>
              <Label htmlFor="product-quantity">{t("form.quantity")}</Label>
              <Input
                id="product-quantity"
                type="number"
                {...register("quantity", { valueAsNumber: true })}
              />
            </div>

            {/* Category + Brand */}
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="product-category">{t("form.category")}</Label>
                <CategorySelect
                  control={control}
                  categories={categories ?? []}
                  placeholder={t("form.selectCategory")}
                  hasError={!!errors.category}
                  onValueChange={(v) => setValue("category", v)}
                />
                {errors.category && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.category.message}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <Label htmlFor="product-brand">{t("form.brand")}</Label>
                <BrandSelect
                  control={control}
                  brands={brands ?? []}
                  placeholder={t("form.selectBrand")}
                  hasError={!!errors.brand}
                  onValueChange={(v) => setValue("brand", v)}
                />
                {errors.brand && (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.brand.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="product-location">{t("form.location")}</Label>
              <Input id="product-location" {...register("location")} />
            </div>
          </div>
        </SectionCard>

        {/* ── Images ── */}
        <SectionCard
          icon={ImageIcon}
          title={t("form.additionalImages")}
          badge={imageFields.length + 1}
        >
          <div className="mb-4">
            <Label htmlFor="product-image">{t("form.imageUrl")}</Label>
            <Input
              id="product-image"
              placeholder={t("form.imageUrlPlaceholder")}
              {...register("image")}
              aria-invalid={!!errors.image}
            />
            {errors.image && (
              <p className="mt-1 text-xs text-destructive">
                {errors.image.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">
              {t("form.additionalImages")}
            </Label>
            {imageFields.map((field, idx) => (
              <div key={field.id} className="flex items-center gap-2">
                <Input
                  placeholder={t("form.imageUrlPlaceholder")}
                  {...register(`images.${idx}.url`)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeImage(idx)}
                  className="shrink-0 text-destructive hover:text-destructive"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendImage({ url: "" })}
              className="mt-1"
            >
              <Plus className="mr-2 size-4" />
              {t("form.addImageUrl")}
            </Button>
          </div>
        </SectionCard>

        {/* ── Variants ── */}
        <SectionCard
          icon={Layers}
          title={t("form.variants")}
          badge={variantFields.length}
        >
          <div className="space-y-3">
            {variantFields.map((variantField, vIdx) => {
              const isOpen = watch(`variants.${vIdx}._open`) ?? true;
              return (
                <Collapsible
                  key={variantField.id}
                  open={isOpen}
                  onOpenChange={(open) => {
                    const current = watch(`variants.${vIdx}`);
                    updateVariant(vIdx, {
                      name: current?.name ?? "",
                      type: current?.type ?? "",
                      options: current?.options ?? [{ name: "", value: "" }],
                      _open: open,
                    });
                  }}
                >
                  <div className="rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <CollapsibleTrigger>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 shrink-0"
                        >
                          {isOpen ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <span className="flex-1 text-sm font-medium">
                        {watch(`variants.${vIdx}.name`) ||
                          `Variant ${vIdx + 1}`}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {watch(`variants.${vIdx}.options`)?.length ?? 0} options
                      </Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeVariant(vIdx)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <CollapsibleContent>
                      <div className="border-t px-3 py-3 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">
                              {t("form.variantName")}
                            </Label>
                            <Input
                              placeholder={t("form.variantNamePlaceholder")}
                              {...register(`variants.${vIdx}.name`)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">
                              {t("form.variantType")}
                            </Label>
                            <Input
                              placeholder={t("form.variantTypePlaceholder")}
                              {...register(`variants.${vIdx}.type`)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        <VariantOptionsEditor
                          control={control}
                          register={register}
                          variantIndex={vIdx}
                          t={t}
                        />
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendVariant({
                  name: "",
                  type: "",
                  options: [{ name: "", value: "" }],
                  _open: true,
                })
              }
            >
              <Plus className="mr-2 size-4" />
              {t("form.addVariant")}
            </Button>
          </div>
        </SectionCard>

        {/* ── SKUs ── */}
        {(skuFields.length > 0 || variantFields.length > 0) && (
          <SectionCard
            icon={Tag}
            title={t("form.skus")}
            badge={skuFields.length}
          >
            {isEdit && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                <span>{t("form.skuEditWarning")}</span>
              </div>
            )}

            {skuFields.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("form.noSkus")}
              </p>
            ) : (
              <>
                <p className="mb-3 text-xs text-muted-foreground">
                  {t("form.autoGenerateSkus")}
                </p>
                <div className="space-y-3">
                  {skuFields.map((skuField, sIdx) => {
                    const variantVals = watch(`skus.${sIdx}.variant_values`);
                    return (
                      <div
                        key={skuField.id}
                        className="rounded-lg border bg-muted/20 p-3 space-y-2"
                      >
                        {variantVals && Object.keys(variantVals).length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {Object.entries(variantVals).map(([k, v]) => (
                              <Badge
                                key={k}
                                variant="secondary"
                                className="text-xs"
                              >
                                {k}: {String(v)}
                              </Badge>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="sm:col-span-1">
                            <Label className="text-xs">
                              {t("form.skuValue")}
                            </Label>
                            <Input
                              {...register(`skus.${sIdx}.value`)}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">
                              {t("form.skuPrice")}
                            </Label>
                            <Input
                              type="number"
                              step="any"
                              {...register(`skus.${sIdx}.price`, {
                                valueAsNumber: true,
                              })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">
                              {t("form.skuStock")}
                            </Label>
                            <Input
                              type="number"
                              {...register(`skus.${sIdx}.stock`, {
                                valueAsNumber: true,
                              })}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">
                              {t("form.skuImage")}
                            </Label>
                            <Input
                              placeholder={t("form.skuImagePlaceholder")}
                              {...register(`skus.${sIdx}.image`)}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </SectionCard>
        )}

        {/* ── Submit ── */}
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isEdit ? tc("buttons.update") : tc("buttons.create")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/products")}
          >
            {tc("buttons.cancel")}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── Category & Brand Selects ────────────────────────────────────────────────
// Separate components with useWatch so they re-render when setValue fires,
// which Controller sometimes misses when value is set before mount.

export function CategorySelect({
  control,
  categories,
  placeholder,
  hasError,
  onValueChange,
}: {
  control: any;
  categories: Array<{ _id: string; name: string }>;
  placeholder: string;
  hasError?: boolean;
  onValueChange?: (v: string) => void;
}) {
  const value = useWatch({ control, name: "category" }) ?? "";
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      key={value || "__cat__"}
    >
      <SelectTrigger id="product-category" aria-invalid={hasError}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {categories.map((c) => (
          <SelectItem key={c._id} value={c._id}>
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BrandSelect({
  control,
  brands,
  placeholder,
  hasError,
  onValueChange,
}: {
  control: any;
  brands: Array<{ _id: string; name: string }>;
  placeholder: string;
  hasError: boolean;
  onValueChange: (v: string) => void;
}) {
  const value = useWatch({ control, name: "brand" }) ?? "";
  return (
    <Select
      value={value}
      onValueChange={onValueChange}
      key={value || "__brand__"}
    >
      <SelectTrigger id="product-brand" aria-invalid={hasError}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {brands.map((b) => (
          <SelectItem key={b._id} value={b._id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ─── Variant Options Sub-editor ───────────────────────────────────────────────

function VariantOptionsEditor({
  control,
  register,
  variantIndex,
  t,
}: {
  control: any;
  register: any;
  variantIndex: number;
  t: any;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `variants.${variantIndex}.options`,
  });

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground uppercase tracking-wide">
        {t("form.variantOptions")}
      </Label>
      {fields.map((optField, oIdx) => (
        <div
          key={optField.id}
          className="grid grid-cols-[1fr_1fr_1.5fr_auto] gap-2 items-end"
        >
          <div>
            <Label className="text-xs">{t("form.optionName")}</Label>
            <Input
              placeholder={t("form.variantNamePlaceholder")}
              {...register(`variants.${variantIndex}.options.${oIdx}.name`)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">{t("form.optionValue")}</Label>
            <Input
              placeholder="e.g. red"
              {...register(`variants.${variantIndex}.options.${oIdx}.value`)}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-xs">{t("form.optionImage")}</Label>
            <Input
              placeholder="https://..."
              {...register(`variants.${variantIndex}.options.${oIdx}.image`)}
              className="h-8 text-sm"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive mb-0.5"
            onClick={() => remove(oIdx)}
            disabled={fields.length <= 1}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-xs h-7"
        onClick={() => append({ name: "", value: "", image: "" })}
      >
        <Plus className="mr-1 size-3" />
        {t("form.addOption")}
      </Button>
    </div>
  );
}
