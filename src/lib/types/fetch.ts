export type FetchOptions = {
  method?: string
  headers?: Record<string, string>
  body?: string | FormData | Blob | ArrayBuffer | null
}
