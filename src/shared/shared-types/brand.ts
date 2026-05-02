export interface Brand {
  _id: string
  name: string
  logo: string
  category: { _id: string; name: string } | string
}
