/** Bentuk response standar backend (TransformInterceptor). */
export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  errors?: string[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  itemCount: number;
}

export interface Paginated<T> {
  items: T[];
  meta: PaginationMeta;
}
