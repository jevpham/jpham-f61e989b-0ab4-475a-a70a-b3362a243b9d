// Plain interface for frontend compatibility
// Backend validates these params directly in the controller/service
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Default values
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;
