const PAGE = 1000 // PostgREST giới hạn db-max-rows (mặc định 1000 trên Supabase), .limit() lớn hơn bị cắt âm thầm

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

/** Lấy hết các dòng bằng cách đọc từng trang 1000 dòng. Truy vấn phải có .order() ổn định (ví dụ theo id). */
export async function selectAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw error
    out.push(...(data ?? []))
    if (!data || data.length < PAGE) return out
  }
}
