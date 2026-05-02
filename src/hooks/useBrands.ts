import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import i18n from 'src/i18n/i18n'
import brandsApi from 'src/apis/brands.api'
import { useActivityLogStore } from 'src/stores/activity-log.store'
import { useAuthStore } from 'src/stores/auth.store'

export const BRAND_KEYS = {
  all: ['admin-brands'] as const,
}

export function useBrands() {
  return useQuery({
    queryKey: BRAND_KEYS.all,
    queryFn: () => brandsApi.getBrands().then((r) => r.data.data),
  })
}

export function useCreateBrand(onSuccess?: () => void) {
  const qc = useQueryClient()
  const addLog = useActivityLogStore((s) => s.addLog)
  const email = useAuthStore((s) => s.user?.email ?? 'admin')
  return useMutation({
    mutationFn: (body: { name: string; logo: string, category: string }) => brandsApi.createBrand(body),
    onSuccess: (_, vars) => {
      toast.success(i18n.t('toast.brandCreated', { ns: 'brands' }))
      addLog({
        action: 'create',
        entityType: 'brand',
        entityName: vars.name,
        adminEmail: email,
      })
      qc.invalidateQueries({ queryKey: BRAND_KEYS.all })
      onSuccess?.()
    },
    onError: () => toast.error(i18n.t('toast.createFailed', { ns: 'brands' })),
  })
}

export function useUpdateBrand(onSuccess?: () => void) {
  const qc = useQueryClient()
  const addLog = useActivityLogStore((s) => s.addLog)
  const email = useAuthStore((s) => s.user?.email ?? 'admin')
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string, logo: string, category: string } }) =>
      brandsApi.updateBrand(id, body),
    onSuccess: (_, vars) => {
      toast.success(i18n.t('toast.brandUpdated', { ns: 'brands' }))
      addLog({
        action: 'update',
        entityType: 'brand',
        entityName: vars.body.name,
        adminEmail: email,
      })
      qc.invalidateQueries({ queryKey: BRAND_KEYS.all })
      onSuccess?.()
    },
    onError: () => toast.error(i18n.t('toast.updateFailed', { ns: 'brands' })),
  })
}

export function useDeleteBrand(onSuccess?: () => void) {
  const qc = useQueryClient()
  const addLog = useActivityLogStore((s) => s.addLog)
  const email = useAuthStore((s) => s.user?.email ?? 'admin')
  return useMutation({
    mutationFn: (id: string) => brandsApi.deleteBrand(id),
    onSuccess: (_, id) => {
      toast.success(i18n.t('toast.brandDeleted', { ns: 'brands' }))
      addLog({ action: 'delete', entityType: 'brand', entityName: id, adminEmail: email })
      qc.invalidateQueries({ queryKey: BRAND_KEYS.all })
      onSuccess?.()
    },
    onError: () => toast.error(i18n.t('toast.deleteFailed', { ns: 'brands' })),
  })
}
