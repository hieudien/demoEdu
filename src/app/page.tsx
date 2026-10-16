import type { Metadata } from 'next'
import Link from 'next/link'
import { Icon } from '@/components/ui'

export const metadata: Metadata = {
  title: 'EduManager · Quản lý lớp học thêm, từ điểm danh đến học phí',
  description: 'Phần mềm quản lý trung tâm dạy thêm và giáo viên dạy kèm: học sinh, lịch dạy, điểm danh, điểm số, bài kiểm tra, học phí và mã QR chuyển khoản.',
}

type Feature = { icon: string; title: string; text: string; beta?: boolean }
const FEATURES: Feature[] = [
  { icon: 'cap', title: 'Học sinh, lớp và ghi danh', text: 'Hồ sơ học sinh kèm thông tin phụ huynh, xếp lớp nhanh, theo dõi sĩ số từng lớp.' },
  { icon: 'dashboard', title: 'Lịch dạy theo tháng', text: 'Lịch cố định của từng lớp, thêm buổi học bù, buổi kiểm tra hoặc báo nghỉ chỉ trong vài giây.' },
  { icon: 'check', title: 'Điểm danh một chạm', text: 'Có mặt, phép hoặc vắng cho cả lớp. Xem lại lịch sử và tỉ lệ chuyên cần của từng em.' },
  { icon: 'clip', title: 'Điểm số và nhận xét', text: 'Bảng điểm cả học kỳ trong một màn hình, nhập điểm theo bài, nhận xét riêng cho từng học sinh.' },
  { icon: 'camera', title: 'Lưu ảnh bài làm', text: 'Chụp bài kiểm tra bằng điện thoại, lưu theo từng học sinh và xem lại bất cứ lúc nào.' },
  { icon: 'wallet', title: 'Học phí và biên lai', text: 'Biết ngay ai đã đóng, ai còn nợ theo từng tháng. Thu tiền mặt hoặc chuyển khoản, in biên lai.' },
  { icon: 'qr', title: 'Mã QR chuyển khoản', text: 'Mỗi học sinh một mã QR riêng kèm nội dung chuyển khoản duy nhất, phụ huynh quét là đủ số tiền.' },
  { icon: 'sparkle', title: 'AI hỗ trợ chấm bài', text: 'Gợi ý điểm và lỗi sai từ ảnh bài làm. Giáo viên luôn xem và duyệt trước khi lưu điểm.', beta: true },
  { icon: 'chat', title: 'Gửi kết quả cho phụ huynh', text: 'Soạn sẵn tin nhắn từ mẫu có điểm và nhận xét, gửi qua Zalo và lưu lại lịch sử đã gửi.', beta: true },
]

const STEPS = [
  { n: '1', title: 'Đăng ký trong một phút', text: 'Chọn trung tâm hoặc giáo viên cá nhân, điền tên và email là có tài khoản.' },
  { n: '2', title: 'Tạo lớp, thêm học sinh', text: 'Nhập lịch học và học phí của lớp, thêm học sinh và xếp vào lớp.' },
  { n: '3', title: 'Dạy và theo dõi hằng ngày', text: 'Điểm danh, chấm điểm, thu học phí. Mọi thứ cập nhật ngay trên mọi thiết bị.' },
]

const FAQ = [
  { q: 'Dữ liệu của tôi có an toàn không?', a: 'Mỗi trung tâm có một không gian dữ liệu riêng. Quyền xem và sửa được kiểm tra ngay ở cơ sở dữ liệu, không chỉ ở giao diện. Ảnh bài làm được lưu riêng tư và chỉ người có quyền mới xem được.' },
  { q: 'Giáo viên của trung tâm đăng nhập bằng cách nào?', a: 'Quản trị viên tạo tài khoản và đặt mật khẩu cho từng giáo viên, không cần gửi email. Giáo viên chỉ thấy các lớp mình dạy và không thấy học phí.' },
  { q: 'Dùng được trên điện thoại không?', a: 'Có. Giao diện thiết kế cho cả điện thoại: điểm danh, chụp bài làm và nhập điểm ngay tại lớp.' },
  { q: 'AI chấm bài có thay giáo viên không?', a: 'Không. AI chỉ gợi ý điểm và lỗi sai, giáo viên luôn là người duyệt cuối cùng. Tính năng này và việc gửi Zalo đang ở giai đoạn thử nghiệm.' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* ===== Thanh trên ===== */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3 md:gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="w-8 h-8 rounded-md bg-indigo-600 text-white flex items-center justify-center"><Icon name="cap" className="w-4 h-4" /></span>EduManager
          </Link>
          <nav className="hidden md:flex items-center gap-5 text-sm text-slate-600 mr-auto">
            <a href="#tinh-nang" className="hover:text-slate-900">Tính năng</a>
            <a href="#doi-tuong" className="hover:text-slate-900">Dành cho ai</a>
            <a href="#bat-dau" className="hover:text-slate-900">Cách bắt đầu</a>
            <a href="#hoi-dap" className="hover:text-slate-900">Hỏi đáp</a>
          </nav>
          <div className="flex items-center gap-2 ml-auto md:ml-0">
            <Link href="/login" className="text-sm px-2.5 sm:px-3 py-1.5 rounded hover:bg-slate-100 whitespace-nowrap">Đăng nhập</Link>
            <Link href="/register" className="text-sm px-3 sm:px-3.5 py-1.5 rounded bg-indigo-600 text-white font-medium hover:bg-indigo-700 whitespace-nowrap">Đăng ký</Link>
          </div>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="relative overflow-hidden border-b bg-gradient-to-b from-indigo-50/70 to-white">
        <div className="max-w-6xl mx-auto px-4 pt-14 pb-16 md:pt-20 md:pb-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="inline-block text-xs font-semibold tracking-wide uppercase text-indigo-700 bg-indigo-100 rounded-full px-3 py-1 mb-5">Cho trung tâm dạy thêm và giáo viên dạy kèm</p>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.15]">
              Quản lý lớp học thêm gọn gàng, <span className="text-indigo-600">từ điểm danh đến học phí</span>
            </h1>
            <p className="mt-5 text-lg text-slate-600 leading-relaxed max-w-xl">
              Học sinh, lịch dạy, điểm số, bài kiểm tra và học phí nằm cùng một nơi. Không cần cài đặt, mở trình duyệt là dùng được, kể cả trên điện thoại.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm">
                Đăng ký dùng thử <Icon name="arrow" className="w-4 h-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center px-5 py-3 rounded-lg border bg-white font-semibold hover:bg-slate-50">Tôi đã có tài khoản</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
              {['Không cần cài đặt', 'Dùng được trên điện thoại', 'Mỗi trung tâm một không gian dữ liệu riêng'].map((t) => (
                <li key={t} className="flex items-center gap-1.5"><Icon name="tick" className="w-4 h-4 text-emerald-600" />{t}</li>
              ))}
            </ul>
          </div>
          <HeroMock />
        </div>
      </section>

      {/* ===== Tính năng ===== */}
      <section id="tinh-nang" className="scroll-mt-16 max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="max-w-2xl mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Mọi việc hằng ngày của một lớp học thêm</h2>
          <p className="mt-3 text-slate-600 text-lg">Làm đúng những việc bạn cần mỗi buổi dạy, không rườm rà.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border p-5 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center"><Icon name={f.icon} className="w-5 h-5" /></span>
                {f.beta && <span className="text-[11px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 rounded px-1.5 py-0.5">Bản thử nghiệm</span>}
              </div>
              <h3 className="font-semibold text-base">{f.title}</h3>
              <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Dành cho ai ===== */}
      <section id="doi-tuong" className="scroll-mt-16 bg-slate-50 border-y">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-20">
          <h2 className="text-3xl font-bold tracking-tight max-w-2xl">Một công cụ, hai cách dùng</h2>
          <div className="mt-10 grid md:grid-cols-2 gap-6">
            <Audience icon="users" title="Trung tâm nhiều giáo viên"
              points={['Chủ trung tâm xem được toàn bộ lớp, học sinh và học phí', 'Cấp tài khoản riêng cho từng giáo viên, không cần gửi email', 'Giáo viên chỉ thấy lớp mình dạy và không thấy học phí', 'Quản lý môn học, phân công giáo viên cho từng lớp']} />
            <Audience icon="book" title="Giáo viên dạy kèm cá nhân"
              points={['Tự quản lý tất cả trong một tài khoản duy nhất', 'Lịch dạy, điểm danh và điểm số gọn nhẹ, đủ dùng', 'Theo dõi học phí từng em, gửi mã QR cho phụ huynh', 'Chụp ảnh bài làm bằng điện thoại và lưu theo từng học sinh']} />
          </div>
        </div>
      </section>

      {/* ===== Cách bắt đầu ===== */}
      <section id="bat-dau" className="scroll-mt-16 max-w-6xl mx-auto px-4 py-16 md:py-20">
        <h2 className="text-3xl font-bold tracking-tight max-w-2xl">Bắt đầu trong ba bước</h2>
        <ol className="mt-10 grid md:grid-cols-3 gap-8">
          {STEPS.map((s) => (
            <li key={s.n} className="relative pl-14">
              <span className="absolute left-0 top-0 w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center">{s.n}</span>
              <h3 className="font-semibold text-lg">{s.title}</h3>
              <p className="mt-1.5 text-slate-600 leading-relaxed">{s.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ===== Hỏi đáp ===== */}
      <section id="hoi-dap" className="scroll-mt-16 bg-slate-50 border-y">
        <div className="max-w-3xl mx-auto px-4 py-16 md:py-20">
          <h2 className="text-3xl font-bold tracking-tight">Câu hỏi thường gặp</h2>
          <div className="mt-8 divide-y border rounded-xl bg-white">
            {FAQ.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="flex items-center justify-between gap-4 cursor-pointer font-medium list-none">
                  {f.q}<span className="text-slate-400 group-open:rotate-45 transition-transform text-xl leading-none">+</span>
                </summary>
                <p className="mt-3 text-slate-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Kêu gọi ===== */}
      <section className="max-w-6xl mx-auto px-4 py-16 md:py-20">
        <div className="rounded-2xl bg-indigo-600 text-white px-6 py-12 md:px-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">Sẵn sàng bỏ sổ giấy và bảng tính?</h2>
          <p className="mt-3 text-indigo-100 text-lg max-w-xl mx-auto">Tạo tài khoản trong một phút và thêm lớp đầu tiên ngay hôm nay.</p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Link href="/register" className="px-6 py-3 rounded-lg bg-white text-indigo-700 font-semibold hover:bg-indigo-50">Đăng ký dùng thử</Link>
            <Link href="/login" className="px-6 py-3 rounded-lg border border-white/50 font-semibold hover:bg-white/10">Đăng nhập</Link>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-2 font-semibold text-slate-700"><span className="w-6 h-6 rounded bg-indigo-600 text-white flex items-center justify-center"><Icon name="cap" className="w-3.5 h-3.5" /></span>EduManager</span>
          <span className="mr-auto">Quản lý lớp học thêm cho trung tâm và giáo viên.</span>
          <Link href="/login" className="hover:text-slate-800">Đăng nhập</Link>
          <Link href="/register" className="hover:text-slate-800">Đăng ký</Link>
        </div>
      </footer>
    </div>
  )
}

function Audience({ icon, title, points }: { icon: string; title: string; points: string[] }) {
  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center"><Icon name={icon} className="w-5 h-5" /></span>
        <h3 className="font-semibold text-lg">{title}</h3>
      </div>
      <ul className="space-y-2.5">
        {points.map((p) => (
          <li key={p} className="flex gap-2.5 text-slate-600"><Icon name="tick" className="w-4 h-4 mt-1 shrink-0 text-emerald-600" />{p}</li>
        ))}
      </ul>
    </div>
  )
}

/** Hình minh họa giao diện (dữ liệu giả, chỉ để giới thiệu) */
function HeroMock() {
  const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']
  const chips: Record<number, [string, string][]> = {
    1: [['18:00 Toán 9A', 'bg-indigo-100 text-indigo-800']], 3: [['17:30 Tiếng Anh', 'bg-sky-100 text-sky-800'], ['19:30 Toán 12', 'bg-emerald-100 text-emerald-800']],
    4: [['18:00 Toán 9A', 'bg-indigo-100 text-indigo-800']], 7: [['16:00 Học bù', 'bg-amber-100 text-amber-800']], 9: [['Kiểm tra', 'bg-rose-100 text-rose-700']],
    10: [['18:00 Vật lý 10', 'bg-violet-100 text-violet-800']], 12: [['17:30 Tiếng Anh', 'bg-sky-100 text-sky-800']], 14: [['18:00 Toán 9A', 'bg-indigo-100 text-indigo-800']],
  }
  return (
    <div aria-hidden className="relative">
      <div className="absolute -inset-4 bg-indigo-200/40 blur-3xl rounded-full" />
      <div className="relative rounded-xl border bg-white shadow-xl overflow-hidden">
        <div className="flex items-center gap-1.5 px-3 py-2 border-b bg-slate-50">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-300" /><span className="w-2.5 h-2.5 rounded-full bg-amber-300" /><span className="w-2.5 h-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 text-[11px] text-slate-400">Lịch dạy · Minh họa</span>
        </div>
        <div className="p-3">
          <div className="grid grid-cols-7 text-center text-[10px] text-slate-400 mb-1">{days.map((d) => <div key={d}>{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded overflow-hidden">
            {Array.from({ length: 14 }, (_, i) => i + 1).map((d) => (
              <div key={d} className={`min-h-14 p-1 bg-white ${d === 3 ? 'ring-2 ring-inset ring-indigo-500' : ''}`}>
                <div className="text-[10px] text-slate-500">{d}</div>
                {(chips[d] ?? []).map(([t, c]) => <div key={t} className={`mt-0.5 truncate rounded px-1 text-[9px] leading-4 ${c}`}>{t}</div>)}
              </div>
            ))}
          </div>
        </div>
        <div className="border-t p-3 bg-slate-50/60">
          <div className="text-[11px] font-semibold text-slate-500 mb-2">Điểm danh · Toán 9A</div>
          {[['Nguyễn Minh Khôi', 'Có mặt', 'bg-emerald-600 text-white'], ['Trần Gia Hân', 'Có mặt', 'bg-emerald-600 text-white'], ['Lê Quang Huy', 'Vắng', 'bg-rose-600 text-white']].map(([n, s, c]) => (
            <div key={n} className="flex items-center justify-between py-1.5 text-xs border-b last:border-0">
              <span className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-[10px]">{n.split(' ').pop()![0]}</span>{n}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${c}`}>{s}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
