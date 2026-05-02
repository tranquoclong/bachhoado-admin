import http from 'src/utils/http'
import type { SuccessResponse, Brand } from 'src/types'

interface BrandListParams {
  page?: number
  limit?: number
}

const brandsApi = {
  getBrands: (params?: BrandListParams) =>
    http.get<SuccessResponse<Brand[]>>('admin/brands', { params }),

  getBrand: (brandId: string) =>
    http.get<SuccessResponse<Brand>>(`admin/brands/${brandId}`),

  createBrand: (body: { name: string; logo: string }) =>
    http.post<SuccessResponse<Brand>>('admin/brands', body),

  updateBrand: (brandId: string, body: { name: string; logo: string }) =>
    http.put<SuccessResponse<Brand>>(`admin/brands/${brandId}`, body),

  deleteBrand: (brandId: string) =>
    http.delete<SuccessResponse<null>>(`admin/brands/delete/${brandId}`),
}

export default brandsApi
