import type { AiResult, Exam, Student } from './data/types'
import { fmtDate } from './utils'

/** Trạng thái hiển thị của bài làm một học sinh */
export const EXAM_STATUS = {
  none: ['Chưa có bài', 'bg-slate-100 text-slate-500'],
  uploaded: ['Đã up ảnh', 'bg-sky-100 text-sky-700'],
  ai: ['AI đã chấm', 'bg-violet-100 text-violet-700'],
  approved: ['Đã duyệt', 'bg-emerald-100 text-emerald-700'],
  sent: ['Đã gửi Zalo', 'bg-teal-100 text-teal-700'],
} as const
export type ExamStatus = keyof typeof EXAM_STATUS

export const DEFAULT_ZALO =
  'Chào phụ huynh em {ten}. Bài {bai} môn {mon} ngày {ngay}: {diem}/{thang} điểm. Nhận xét: {nhanxet} Trân trọng, {trungtam}.'

export function buildMessage(opts: { template: string | null | undefined; exam: Exam; student: Student; subject: string; score: number | null; comment: string; org: string }) {
  const { exam, student, comment } = opts
  const map: Record<string, string> = {
    ten: student.name, bai: exam.name, mon: opts.subject, ngay: fmtDate(exam.date),
    diem: opts.score === null ? '—' : String(opts.score), thang: String(exam.max_score),
    nhanxet: comment.trim() ? comment.trim().replace(/\.?$/, '.') : '', trungtam: opts.org,
  }
  return (opts.template || DEFAULT_ZALO).replace(/\{(\w+)\}/g, (_, k) => map[k] ?? '').replace(/\s+/g, ' ').trim()
}

/* ---------- AI chấm giả lập (bản thật: gọi Claude vision qua route handler) ---------- */
const hash = (s: string) => { let h = 7; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h }
const ERRORS = ['Câu 2: thiếu bước biến đổi', 'Câu 3: sai dấu khi chuyển vế', 'Câu 5: chưa kết luận nghiệm', 'Câu 4: trình bày chưa rõ ràng',
  'Câu 1: tính toán nhầm ở bước cuối', 'Câu 6: thiếu đơn vị ở kết quả', 'Câu 7: chưa xét điều kiện xác định']
const PRAISE = ['Bài làm tốt, lập luận chặt chẽ.', 'Trình bày rõ ràng, kết quả chính xác.', 'Nắm vững kiến thức, cần cẩn thận hơn ở bước tính.']
const MID = ['Hiểu bài nhưng còn sai sót ở một số bước.', 'Kết quả khá, cần rà soát lại phép biến đổi.', 'Cần trình bày đầy đủ các bước hơn.']
const LOW = ['Cần ôn lại kiến thức nền tảng của chương.', 'Còn nhiều lỗi cơ bản, nên luyện thêm dạng bài tương tự.', 'Chưa nắm chắc phương pháp, đề nghị học phụ đạo thêm.']

export async function fakeAiGrade(ctx: { studentAvg: number | null; exam: Exam; studentId: string }): Promise<AiResult> {
  await new Promise((r) => setTimeout(r, 1200 + (hash(ctx.studentId) % 800))) // mô phỏng độ trễ của AI
  const h = hash(ctx.studentId + ctx.exam.id)
  const base = ctx.studentAvg ?? 6.5
  const s10 = Math.max(0, Math.min(10, Math.round((base + ((h % 100) / 100 - 0.5) * 2) * 4) / 4))
  const score = Math.round(((s10 * ctx.exam.max_score) / 10) * 4) / 4
  const nErr = s10 >= 8 ? h % 2 : s10 >= 6 ? 1 + (h % 2) : 2 + (h % 2)
  const errors = Array.from({ length: nErr }, (_, i) => ERRORS[(h + i * 3) % ERRORS.length])
  const pool = s10 >= 8 ? PRAISE : s10 >= 6 ? MID : LOW
  return {
    score, errors, confidence: Math.round(72 + (h % 24)) / 100,
    comment: (ctx.exam.brief?.trim() ? 'Đã đối chiếu với đáp án. ' : '') + pool[h % pool.length],
  }
}

/** Nén ảnh ở trình duyệt trước khi upload */
export function compressImage(file: File, max = 1400, quality = 0.75): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height))
      const c = document.createElement('canvas')
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Không nén được ảnh'))), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh')) }
    img.src = url
  })
}
