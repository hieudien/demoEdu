/**
 * Tạo tài khoản + dữ liệu thử cho môi trường DEV (không dùng cho dữ liệu thật).
 *   node --env-file=.env scripts/seed-test.mjs
 * Chạy lại được: xóa tổ chức/tài khoản thử cũ rồi tạo mới. Mật khẩu lấy từ TEST_PASSWORD trong .env
 * (tự sinh và ghi vào .env nếu chưa có).
 */
import { randomBytes, randomUUID } from 'node:crypto'
import { appendFileSync } from 'node:fs'
import { deflateSync, crc32 } from 'node:zlib'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error('Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
let password = process.env.TEST_PASSWORD
if (!password) {
  password = randomBytes(9).toString('base64url')
  appendFileSync('.env', `\nTEST_PASSWORD=${password}\n`)
}
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

const ACCOUNTS = {
  center: { org: 'Trung tâm Ánh Dương (test)', owner: 'center.test@example.com', ownerName: 'Chủ trung tâm Test', teacherEmail: 'gv.test@example.com' },
  solo: { org: 'Lớp Toán cô Lan (test)', owner: 'solo.test@example.com', ownerName: 'Nguyễn Thị Lan' },
}

/* ---------- tiện ích ---------- */
const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const today = new Date()
const addDays = (n) => { const d = new Date(today); d.setDate(d.getDate() + n); return d }
const rng = (s) => () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296
const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data }
async function insert(table, rows) {
  for (let i = 0; i < rows.length; i += 400) must(await sb.from(table).insert(rows.slice(i, i + 400)), `insert ${table}`)
}

/** PNG đơn giản mô phỏng giấy kẻ ô + nét chữ, không cần thư viện ảnh */
function makePng(seed, w = 420, h = 600) {
  const r = rng(seed)
  const px = Buffer.alloc((w * 3 + 1) * h)
  for (let y = 0; y < h; y++) {
    px[y * (w * 3 + 1)] = 0
    for (let x = 0; x < w; x++) {
      const o = y * (w * 3 + 1) + 1 + x * 3
      const line = y > 50 && (y - 50) % 36 === 0
      px[o] = line ? 200 : 255; px[o + 1] = line ? 220 : 254; px[o + 2] = line ? 250 : 248
    }
  }
  for (let row = 0; row < 12; row++) {
    const y0 = 80 + row * 36, len = 120 + r() * 240
    for (let x = 36; x < 36 + len && x < w; x++) {
      const y = Math.round(y0 + Math.sin(x / (6 + r() * 0.5)) * 3 + r() * 1.5)
      for (let t = 0; t < 2; t++) { const o = (y + t) * (w * 3 + 1) + 1 + x * 3; px[o] = 30; px[o + 1] = 58; px[o + 2] = 138 }
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body))
    return Buffer.concat([len, body, crc])
  }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(px)), chunk('IEND', Buffer.alloc(0))])
}

/* ---------- dữ liệu mẫu ---------- */
const TEACHERS = [['Nguyễn Thị Lan', '0912345678'], ['Trần Văn Minh', '0987654321'], ['Lê Hoàng Anh', '0903111222']]
const SUBJECTS = ['Toán', 'Tiếng Anh', 'Vật lý', 'Ngữ văn']
// [tên, môn(idx), gv(idx), ngày học, bắt đầu, kết thúc, phòng, học phí]
const CLASSES_CENTER = [
  ['Toán 9A', 0, 0, [1, 3], '18:00', '19:30', 'P101', 600000], ['Toán 12 luyện thi', 0, 1, [2, 4], '19:30', '21:00', 'P102', 800000],
  ['Tiếng Anh giao tiếp', 1, 2, [2, 5], '17:30', '19:00', 'P201', 700000], ['Vật lý 10', 2, 1, [3, 6], '18:00', '19:30', 'P103', 650000],
  ['Ngữ văn 11', 3, 0, [4, 6], '19:30', '21:00', 'P101', 550000],
]
const CLASSES_SOLO = [
  ['Toán 9 - nhóm A', null, 0, [1, 3], '18:00', '19:30', 'Nhà cô', 500000], ['Toán 12 luyện thi', null, 0, [2, 4], '19:30', '21:00', 'Nhà cô', 700000],
  ['Toán 6 - kèm nhóm nhỏ', null, 0, [6], '09:00', '10:30', 'Nhà cô', 400000], ['Toán 8 - cuối tuần', null, 0, [0], '15:00', '16:30', 'Nhà cô', 450000],
]
const STUDENTS = ['Nguyễn Minh Khôi', 'Trần Gia Hân', 'Lê Quang Huy', 'Phạm Thảo Nguyên', 'Hoàng Đức Anh', 'Vũ Ngọc Mai', 'Đặng Bảo Châu', 'Bùi Anh Tuấn', 'Đỗ Khánh Linh', 'Ngô Hải Đăng', 'Dương Phương Thảo', 'Lý Gia Bảo', 'Phan Thu Hà', 'Võ Thành Đạt', 'Trịnh Mỹ Linh', 'Huỳnh Nhật Minh', 'Mai Tuệ Lâm', 'Đinh Hoàng Yến', 'Cao Văn Long', 'Tạ Diễm Quỳnh', 'Lương Gia Khang', 'Châu Bích Ngọc', 'Kiều Minh Quân', 'Hà Thùy Dương', 'Tô Anh Khoa']
const PARENTS = ['Nguyễn Văn Hùng', 'Trần Thị Hoa', 'Lê Văn Tâm', 'Phạm Thị Thu', 'Hoàng Văn Nam', 'Vũ Thị Lệ', 'Đặng Văn Sơn', 'Bùi Thị Hạnh']
const COMMENTS = ['Làm bài tốt', 'Cần cẩn thận hơn', 'Tiến bộ rõ rệt', 'Nên ôn lại phần cơ bản', 'Chưa nộp đủ bài tập', 'Trình bày sạch đẹp', 'Sai sót do thiếu tập trung', 'Cần luyện thêm dạng bài nâng cao']
const AI_ERRORS = ['Câu 2: thiếu bước biến đổi', 'Câu 3: sai dấu khi chuyển vế', 'Câu 5: chưa kết luận nghiệm', 'Câu 4: trình bày chưa rõ ràng', 'Câu 1: tính toán nhầm ở bước cuối']
const EXAMS_PER_CLASS = 20

/** xóa đệ quy mọi file dưới một thư mục trong bucket ảnh */
async function removeFolder(prefix) {
  const { data, error } = await sb.storage.from('submissions').list(prefix, { limit: 1000 })
  if (error) throw error
  const files = []
  for (const it of data) {
    const path = `${prefix}/${it.name}`
    if (it.id) files.push(path); else await removeFolder(path)
  }
  if (files.length) must(await sb.storage.from('submissions').remove(files), 'xóa ảnh cũ')
}

async function wipeOld() {
  const names = Object.values(ACCOUNTS).map((a) => a.org)
  const old = must(await sb.from('orgs').select('id').in('name', names), 'tìm org cũ')
  for (const o of old) await removeFolder(o.id) // xóa org không xóa file trong Storage
  must(await sb.from('orgs').delete().in('name', names), 'xóa org cũ')
  const emails = new Set([ACCOUNTS.center.owner, ACCOUNTS.center.teacherEmail, ACCOUNTS.solo.owner])
  for (let page = 1; ; page++) {
    const { data } = await sb.auth.admin.listUsers({ page, perPage: 200 })
    for (const u of data.users) if (emails.has(u.email)) await sb.auth.admin.deleteUser(u.id)
    if (data.users.length < 200) break
  }
}

async function createUser(email, fullName) {
  const r = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } })
  if (r.error) throw new Error(`tạo user ${email}: ${r.error.message}`)
  return r.data.user.id
}

async function build(mode) {
  const solo = mode === 'solo'
  const acc = ACCOUNTS[mode]
  const r = rng(solo ? 7 : 42)
  const orgId = randomUUID()
  const ownerId = await createUser(acc.owner, acc.ownerName)
  must(await sb.from('orgs').insert({ id: orgId, name: acc.org, type: mode }), 'org')
  must(await sb.from('profiles').insert({ id: ownerId, org_id: orgId, role: 'owner', full_name: acc.ownerName }), 'profile owner')
  must(await sb.from('org_settings').insert({ org_id: orgId, bank: 'MB', account: '0123456789', account_name: 'TRUNG TAM TEST' }), 'settings')

  // giáo viên
  const teachers = (solo ? TEACHERS.slice(0, 1) : TEACHERS).map(([name, phone], i) => ({ id: randomUUID(), name, phone, idx: i }))
  let loginTeacher = null
  if (solo) teachers[0].profile_id = ownerId
  else {
    const uid = await createUser(acc.teacherEmail, teachers[0].name)
    must(await sb.from('profiles').insert({ id: uid, org_id: orgId, role: 'teacher', full_name: teachers[0].name }), 'profile gv')
    teachers[0].profile_id = uid
    loginTeacher = acc.teacherEmail
  }
  await insert('teachers', teachers.map((t, i) => ({
    id: t.id, org_id: orgId, profile_id: t.profile_id ?? null, name: t.name, phone: t.phone,
    email: t.profile_id ? (solo ? acc.owner : acc.teacherEmail) : `gv${i + 1}@example.com`,
  })))

  const subjects = solo ? [] : SUBJECTS.map((name) => ({ id: randomUUID(), name }))
  await insert('subjects', subjects.map((s) => ({ ...s, org_id: orgId })))

  const classes = (solo ? CLASSES_SOLO : CLASSES_CENTER).map(([name, sub, gv, days, a, b, room, fee]) => ({
    id: randomUUID(), org_id: orgId, name, subject_id: sub === null ? null : subjects[sub].id, teacher_id: teachers[gv].id, days, time_start: a, time_end: b, room, fee,
  }))
  await insert('classes', classes)

  const students = STUDENTS.slice(0, solo ? 14 : 25).map((name, i) => ({
    id: randomUUID(), org_id: orgId, name, dob: `${2008 + (i % 6)}-${pad(1 + (i % 12))}-${pad(1 + ((i * 3) % 28))}`,
    parent_name: PARENTS[i % PARENTS.length], parent_phone: '09' + String(10000000 + Math.floor(r() * 89999999)),
  }))
  await insert('students', students)

  const start = iso(addDays(-150)), nc = classes.length
  const enrollments = []
  students.forEach((s, i) => {
    const cs = new Set([i % nc]); if (i % 3 === 0) cs.add((i + 1) % nc)
    cs.forEach((ci) => enrollments.push({ org_id: orgId, student_id: s.id, class_id: classes[ci].id, start_date: start }))
  })
  await insert('enrollments', enrollments)
  const roster = (cid) => enrollments.filter((e) => e.class_id === cid).map((e) => e.student_id)

  // điểm danh 8 tuần gần nhất
  const sessions = [], attendance = []
  for (let n = -56; n <= -1; n++) {
    const d = addDays(n)
    for (const c of classes) {
      if (!c.days.includes(d.getDay())) continue
      const sid = randomUUID(); sessions.push({ id: sid, org_id: orgId, class_id: c.id, date: iso(d) })
      for (const stId of roster(c.id)) { const x = r(); attendance.push({ org_id: orgId, session_id: sid, student_id: stId, status: x < 0.82 ? 'present' : x < 0.93 ? 'absent' : 'excused' }) }
    }
  }
  await insert('sessions', sessions); await insert('attendance', attendance)

  // 20 bài kiểm tra mỗi lớp, mọi học sinh đều có điểm
  const ability = Object.fromEntries(students.map((s) => [s.id, 4.8 + r() * 3.7]))
  const exams = [], subs = []
  for (const c of classes) {
    for (let k = 0; k < EXAMS_PER_CLASS; k++) {
      const ex = { id: randomUUID(), org_id: orgId, class_id: c.id, name: (k % 5 === 4 ? 'Kiểm tra 1 tiết' : 'Kiểm tra 15 phút') + ' bài ' + (k + 1), date: iso(addDays(-7 * (EXAMS_PER_CLASS - k))), max_score: 10, brief: '' }
      exams.push(ex)
      for (const stId of roster(c.id)) {
        const score = Math.max(0, Math.min(10, Math.round((ability[stId] + (k / EXAMS_PER_CLASS - 0.5) * 0.8 + (r() - 0.5) * 3.2) * 4) / 4))
        subs.push({ org_id: orgId, exam_id: ex.id, student_id: stId, status: 'approved', score, comment: r() < 0.35 ? COMMENTS[Math.floor(r() * COMMENTS.length)] : '', reviewed_at: new Date().toISOString() })
      }
    }
  }
  // bài mới nhất: mỗi học sinh một trạng thái để thấy đủ quy trình
  const newExams = [], images = [], messages = []
  for (const c of classes) {
    const ex = { id: randomUUID(), org_id: orgId, class_id: c.id, name: 'Kiểm tra 15 phút bài 21', date: iso(addDays(-2)), max_score: 10, brief: 'Đáp án: Câu 1: x = 2. Câu 2: y = 5. Câu 3: S = {1; 3}.' }
    newExams.push(ex)
    const template = 'Chào phụ huynh em {ten}. Bài {bai}: {diem}/{thang} điểm. Nhận xét: {nhanxet} Trân trọng.'
    roster(c.id).forEach((stId, i) => {
      const k = i % 5
      if (k === 0) return // chưa nộp bài
      const sc = Math.max(0, Math.min(10, Math.round((ability[stId] + (r() - 0.5) * 2) * 4) / 4))
      const nErr = sc >= 8 ? 0 : sc >= 6 ? 1 : 2
      const ai = { score: sc, confidence: Math.round(75 + r() * 20) / 100, errors: AI_ERRORS.slice(0, nErr), comment: 'Đã đối chiếu với đáp án. ' + (sc >= 8 ? 'Bài làm tốt.' : sc >= 6 ? 'Còn sai sót ở một số bước.' : 'Cần ôn lại kiến thức nền tảng.') }
      const id = randomUUID()
      const row = { id, org_id: orgId, exam_id: ex.id, student_id: stId, status: k === 1 ? 'uploaded' : k === 2 ? 'ai_graded' : 'approved', ai_result: k >= 2 ? ai : null }
      if (k >= 3) { row.score = sc; row.comment = ai.comment; row.reviewed_at = new Date().toISOString() }
      subs.push(row)
      images.push({ subId: id, studentId: stId, examId: ex.id, seed: i * 31 + classes.indexOf(c) })
      if (k === 4) messages.push({ org_id: orgId, student_id: stId, exam_id: ex.id, channel: 'zalo', status: 'sent', sent_at: new Date().toISOString(),
        content: template.replace('{ten}', students.find((s) => s.id === stId).name).replace('{bai}', ex.name).replace('{diem}', sc).replace('{thang}', 10).replace('{nhanxet}', ai.comment) })
    })
  }
  await insert('exams', [...exams, ...newExams])
  // PostgREST gộp insert hàng loạt theo tập cột: chuẩn hóa để mọi dòng có đủ cột
  await insert('submissions', subs.map((s) => ({ id: randomUUID(), score: null, comment: '', note: '', ai_result: null, reviewed_at: null, ...s })))
  const imgRows = []
  for (const im of images) {
    const path = `${orgId}/${im.examId}/${im.studentId}/${randomUUID()}.png`
    must(await sb.storage.from('submissions').upload(path, makePng(im.seed), { contentType: 'image/png' }), 'upload ảnh')
    imgRows.push({ org_id: orgId, submission_id: im.subId, storage_path: path, position: 0 })
  }
  await insert('submission_images', imgRows); await insert('messages', messages)

  // lịch sắp tới: học bù, kiểm tra, nghỉ
  const nextDay = (from, days) => { for (let n = from; n < from + 14; n++) if (days.includes(addDays(n).getDay())) return n; return from }
  const ev = (c, n, type, time, note) => c && events.push({ org_id: orgId, class_id: c.id, date: iso(addDays(n)), type, time_start: time || null, note })
  const events = []
  const [c1, c2, c3, c4, c5] = classes
  ev(c1, 4, 'makeup', '16:00', 'Học bù buổi nghỉ tuần trước'); ev(c2, nextDay(2, c2.days), 'off', null, 'GV bận việc riêng')
  ev(c3, nextDay(5, c3.days), 'exam', null, 'Kiểm tra giữa kỳ'); ev(c1, nextDay(10, c1.days), 'exam', null, 'Kiểm tra 1 tiết')
  ev(c2, 12, 'makeup', '09:00', 'Ôn tập trước kỳ thi'); ev(c4, c4 ? nextDay(16, c4.days) : 0, 'off', null, 'Nghỉ lễ')
  ev(c5, 20, 'exam', null, 'Kiểm tra cuối kỳ'); ev(c3, -3, 'makeup', '18:30', 'Học bù')
  await insert('events', events)

  // học phí: tháng trước ~85% đã đóng, tháng này ~45%
  const payments = [], seen = new Set()
  for (const [d, p] of [[new Date(today.getFullYear(), today.getMonth() - 1, 15), 0.85], [today, 0.45]]) {
    const period = iso(d).slice(0, 7)
    for (const e of enrollments) {
      const k = e.student_id + e.class_id + period
      if (seen.has(k) || r() >= p) continue
      seen.add(k)
      const fee = classes.find((c) => c.id === e.class_id).fee
      payments.push({ org_id: orgId, student_id: e.student_id, class_id: e.class_id, period, amount: fee, method: r() < 0.5 ? 'cash' : 'bank',
        paid_at: d === today ? iso(today) : `${period}-${pad(3 + Math.floor(r() * 15))}` })
    }
  }
  await insert('payments', payments)

  return { mode, org: acc.org, owner: acc.owner, teacher: loginTeacher, students: students.length, classes: classes.length, exams: exams.length + newExams.length, submissions: subs.length, images: imgRows.length, attendance: attendance.length, payments: payments.length }
}

await wipeOld()
const out = [await build('center'), await build('solo')]
console.table(out)
