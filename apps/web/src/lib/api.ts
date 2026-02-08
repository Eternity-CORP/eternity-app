import { createApiClient } from '@e-y/shared'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

export const apiClient = createApiClient({ baseUrl: API_BASE_URL })

export { API_BASE_URL }
