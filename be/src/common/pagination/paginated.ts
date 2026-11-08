export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  itemCount: number;
}

/**
 * Kembalikan instance class ini dari controller/service agar
 * TransformInterceptor memindahkan `meta` ke level atas response.
 */
export class Paginated<T> {
  readonly meta: PaginationMeta;

  constructor(
    readonly items: T[],
    totalItems: number,
    page: number,
    limit: number,
  ) {
    this.meta = {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      itemCount: items.length,
    };
  }
}
