import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { ArrowLeft, Pencil, Eye, MapPin, Package, Star, Tag, Layers, Images } from 'lucide-react'
import { Button } from 'src/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from 'src/components/ui/card'
import { Badge } from 'src/components/ui/badge'
import { Separator } from 'src/components/ui/separator'
import { PageHeader } from 'src/components/shared/PageHeader'
import { LoadingState } from 'src/components/shared/LoadingState'
import { ErrorState } from 'src/components/shared/ErrorState'
import { useProductDetail } from 'src/hooks/useProductDetail'
import { formatCurrency } from 'src/utils/format'

export default function ProductDetailPage() {
  const { t } = useTranslation('products')
  const { t: tc } = useTranslation('common')
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: product, isLoading, error } = useProductDetail(id)
  const [activeImage, setActiveImage] = useState<string | null>(null)

  if (isLoading) return <LoadingState />
  if (error || !product)
    return <ErrorState message={t('notFound')} onRetry={() => navigate('/products')} />

  const categoryName =
    typeof product.category === 'object' ? product.category.name : product.category
  const brandName = typeof product.brand === 'object' ? product.brand.name : product.brand
  const allImages = [product.image, ...(product.images ?? [])].filter(Boolean)
  const displayImage = activeImage ?? product.image

  const discountPct =
    product.price_before_discount > product.price
      ? Math.round((1 - product.price / product.price_before_discount) * 100)
      : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title={product.name}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/products')}>
              <ArrowLeft className="mr-2 size-4" />
              {tc('buttons.back')}
            </Button>
            <Button size="sm" onClick={() => navigate(`/products/${id}/edit`)}>
              <Pencil className="mr-2 size-4" />
              {tc('buttons.edit')}
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Left column: images + description ── */}
        <div className="space-y-4 lg:col-span-2">
          {/* Image gallery */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Images className="size-4 text-muted-foreground" />
                {t('detail.images', 'Hình ảnh')}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {allImages.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Main image */}
              <div className="relative overflow-hidden rounded-lg border bg-muted/30">
                <img src={displayImage} alt={product.name} className="h-72 w-full object-contain" />
                {discountPct > 0 && (
                  <Badge className="absolute left-2 top-2 bg-destructive text-destructive-foreground">
                    -{discountPct}%
                  </Badge>
                )}
              </div>

              {/* Thumbnail strip */}
              {allImages.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {allImages.map((url, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(url)}
                      className={`shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                        (activeImage ?? product.image) === url
                          ? 'border-primary'
                          : 'border-transparent hover:border-muted-foreground/40'
                      }`}
                    >
                      <img
                        src={url}
                        alt={`${product.name} ${idx + 1}`}
                        className="h-16 w-16 object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('form.description')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {product.description || tc('states.noDescription')}
              </p>
            </CardContent>
          </Card>

          {/* Variants */}
          {product.variants && product.variants.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="size-4 text-muted-foreground" />
                  {t('form.variants')}
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {product.variants.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {product.variants.map((variant, vIdx) => (
                  <div key={(variant as any)._id ?? vIdx}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-sm font-medium">{variant.name}</span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {variant.type}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {variant.options.map((opt, oIdx) => (
                        <div
                          key={(opt as any)._id ?? oIdx}
                          className="flex items-center gap-1.5 rounded-md border bg-muted/40 px-2 py-1"
                        >
                          {opt.image && (
                            <img
                              src={opt.image}
                              alt={opt.name}
                              className="size-5 rounded-sm object-cover"
                            />
                          )}
                          <span className="text-xs font-medium">{opt.name}</span>
                          <span className="text-xs text-muted-foreground">({opt.value})</span>
                        </div>
                      ))}
                    </div>
                    {vIdx < product.variants!.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* SKUs table */}
          {product.skus && product.skus.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="size-4 text-muted-foreground" />
                  {t('form.skus')}
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {product.skus.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="pb-2 pr-3 text-left font-medium">{t('form.skuValue')}</th>
                        <th className="pb-2 pr-3 text-left font-medium">
                          {t('detail.variants', 'Biến thể')}
                        </th>
                        <th className="pb-2 pr-3 text-right font-medium">{t('form.skuPrice')}</th>
                        <th className="pb-2 pr-3 text-right font-medium">{t('form.skuStock')}</th>
                        <th className="pb-2 text-left font-medium">{t('form.skuImage')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {product.skus.map((sku, sIdx) => (
                        <tr key={(sku as any)._id ?? sIdx} className="hover:bg-muted/30">
                          <td className="py-2 pr-3 font-mono text-xs">{sku.value}</td>
                          <td className="py-2 pr-3">
                            <div className="flex flex-wrap gap-1">
                              {sku.variant_values &&
                                Object.entries(sku.variant_values).map(([k, v]) => (
                                  <Badge key={k} variant="secondary" className="text-xs">
                                    {k}: {v}
                                  </Badge>
                                ))}
                            </div>
                          </td>
                          <td className="py-2 pr-3 text-right font-medium">
                            {formatCurrency(sku.price)}
                          </td>
                          <td className="py-2 pr-3 text-right">
                            <Badge
                              variant={
                                sku.stock === 0
                                  ? 'destructive'
                                  : sku.stock < 10
                                    ? 'outline'
                                    : 'secondary'
                              }
                              className="text-xs"
                            >
                              {sku.stock}
                            </Badge>
                          </td>
                          <td className="py-2">
                            {sku.image ? (
                              <img
                                src={sku.image}
                                alt={sku.value}
                                className="size-8 rounded object-cover border"
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── Right column: info cards ── */}
        <div className="space-y-4">
          {/* Pricing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t('detail.info')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('detail.price')}</span>
                <span className="text-lg font-semibold text-primary">
                  {formatCurrency(product.price)}
                </span>
              </div>
              {discountPct > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('detail.original')}</span>
                  <span className="line-through text-muted-foreground">
                    {formatCurrency(product.price_before_discount)}
                  </span>
                </div>
              )}
              {discountPct > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('detail.discount', 'Giảm giá')}</span>
                  <Badge className="bg-destructive text-destructive-foreground">
                    -{discountPct}%
                  </Badge>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Package className="size-3.5" />
                  {t('detail.stock')}
                </span>
                <Badge
                  variant={
                    product.quantity === 0
                      ? 'destructive'
                      : product.quantity < 10
                        ? 'outline'
                        : 'secondary'
                  }
                >
                  {product.quantity}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('detail.sold')}</span>
                <span className="font-medium">{product.sold}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Eye className="size-3.5" />
                  {t('detail.view', 'Lượt xem')}
                </span>
                <span>{product.view}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Star className="size-3.5" />
                  {t('detail.rating')}
                </span>
                <Badge variant="secondary">{product.rating.toFixed(1)} ★</Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('detail.category')}</span>
                <Badge variant="outline">{categoryName}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('detail.brand')}</span>
                <Badge variant="outline">{brandName}</Badge>
              </div>

              {product.location && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {t('form.location')}
                  </span>
                  <span className="text-right max-w-[60%] truncate">{product.location}</span>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('detail.created')}</span>
                <span className="text-xs">
                  {format(new Date(product.createdAt), 'MMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">{t('detail.updated', 'Cập nhật')}</span>
                <span className="text-xs">
                  {format(new Date(product.updatedAt), 'MMM d, yyyy')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* SKU summary */}
          {product.skus && product.skus.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-sm">
                  {t('detail.skuSummary', 'Tổng quan SKU')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('detail.totalSkus', 'Số SKU')}</span>
                  <span className="font-medium">{product.skus.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('detail.totalStock', 'Tổng tồn kho')}
                  </span>
                  <span className="font-medium">
                    {product.skus.reduce((sum, s) => sum + s.stock, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    {t('detail.priceRange', 'Khoảng giá')}
                  </span>
                  <span className="font-medium text-xs">
                    {formatCurrency(Math.min(...product.skus.map((s) => s.price)))}
                    {' – '}
                    {formatCurrency(Math.max(...product.skus.map((s) => s.price)))}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
