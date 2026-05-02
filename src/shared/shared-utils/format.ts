export function formatPrice(value: number | string): string {
  return `₫${Number(value).toLocaleString('vi-VN')}`
}