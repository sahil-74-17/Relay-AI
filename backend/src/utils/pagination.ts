export interface PageParams {
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const toSkipTake = ({ page, pageSize }: PageParams) => ({ skip: (page - 1) * pageSize, take: pageSize });

export const paginate = <T>(items: T[], total: number, { page, pageSize }: PageParams): Paginated<T> => ({
  items,
  page,
  pageSize,
  total,
  totalPages: Math.max(1, Math.ceil(total / pageSize)),
});
