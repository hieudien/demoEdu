'use client'
import { useState } from 'react'
import { useConfirm, useToast } from '@/components/Providers'
import { ClassSelect } from '@/components/ClassSelect'
import { Avatar, Empty, Forbidden, Loading, Modal } from '@/components/ui'
import { useCoreQ } from '@/lib/data/core'
import { feeRows, feeTotals, payCode, qrUrl, useFeeActions, useFees, useOrgSettings, useSettingsActions } from '@/lib/data/fees'
import { useMe } from '@/lib/me'
import { BANKS, fmtDate, iso, shiftMonth, vnd } from '@/lib/utils'

type Filter = 'all' | 'debt' | 'paid'

export default function FeesPage() {
  const me = useMe()
  const toast = useToast()
  const confirm = useConfirm()
  const { ready, error, core, q } = useCoreQ()
  const [month, setMonth] = useState(iso(new Date()).slice(0, 7))
  const [filter, setFilter] = useState<Filter>('all')
  const [classId, setClassId] = useState('')
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState<{ kind: 'qr' | 'receipt'; key: string } | null>(null)
  const [settings, setSettings] = useState(false)
  const fees = useFees(month)
  const org = useOrgSettings()
  const act = useFeeActions()
  const sact = useSettingsActions()
  const [draftSet, setDraftSet] = useState<{ bank: string; account: string; account_name: string } | null>(null)

  if (!me.isAdmin) return <Forbidden />
  if (!ready || fees.isLoading) return <Loading error={error ?? fees.error} />
  if (!fees.data) return <Loading error={fees.error} />

  const all = feeRows(core, fees.data, classId, search)
  const paidN = all.filter((r) => r.p).length
  const rows = all.filter((r) => filter === 'all' || (filter === 'paid') === !!r.p)
  const t = feeTotals(all)
  const target = open ? all.find((r) => r.key === open.key) : undefined
  const s = org.data

  const FILTERS: [Filter, string, string][] = [
    ['all', `Tất cả (${all.length})`, 'bg-indigo-600 text-white'],
    ['debt', `Còn nợ (${all.length - paidN})`, 'bg-rose-600 text-white'],
    ['paid', `Đã đóng (${paidN})`, 'bg-emerald-600 text-white'],
  ]

  return (
    <section>
      <div className="flex items-center mb-3">
        <h1 className="page-title mr-auto">Học phí</h1>
        <button className="border rounded px-2 py-1 bg-white text-xs" onClick={() => { setDraftSet(s ? { bank: s.bank, account: s.account, account_name: s.account_name } : null); setSettings(true) }}>⚙ Tài khoản nhận tiền</button>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 mb-3">
        <div className="flex items-center justify-between mb-3">
          <button className="border rounded-full w-8 h-8" onClick={() => setMonth(shiftMonth(month, -1))}>‹</button>
          <div className="font-semibold">Tháng {month.slice(5)}/{month.slice(0, 4)}</div>
          <button className="border rounded-full w-8 h-8" onClick={() => setMonth(shiftMonth(month, 1))}>›</button>
        </div>
        <div className="grid grid-cols-3 text-center mb-3">
          <div><div className="text-xs text-slate-500">Phải thu</div><div className="font-bold">{vnd(t.total)}</div></div>
          <div><div className="text-xs text-slate-500">Đã thu</div><div className="font-bold text-emerald-600">{vnd(t.paid)}</div></div>
          <div><div className="text-xs text-slate-500">Còn nợ</div><div className="font-bold text-rose-600">{vnd(t.debt)}</div></div>
        </div>
        <div className="h-2 bg-slate-200 rounded"><div className="h-2 bg-emerald-500 rounded" style={{ width: t.pct + '%' }} /></div>
        <div className="text-xs text-slate-500 mt-1">{t.pct}% đã thu</div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <div className="flex bg-white rounded-lg border overflow-hidden text-xs">
          {FILTERS.map(([id, label, on], i) => (
            <button key={id} className={`px-3 py-1.5 ${i ? 'border-l' : ''} ${filter === id ? on : ''}`} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <div className="w-full sm:w-72">
          <ClassSelect classes={core.classes} value={classId} onChange={setClassId} allowAll flush allLabel="Tất cả lớp"
            sub={(c) => `${q.schedule(c)} · ${q.enrolled(c.id).length} học sinh`} dot={(c) => q.color(c).dot}
            teacherOf={me.isCenter ? (c) => q.teacherName(c.teacher_id) : undefined} />
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm học sinh..." className="border rounded-lg px-3 py-1.5 flex-1 min-w-32 text-xs bg-white" />
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="bg-white rounded-lg shadow-sm p-3 flex flex-wrap items-center gap-3">
            <Avatar name={r.st.name} className={`w-10 h-10 ${r.p ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`} />
            <div className="flex-1 min-w-36">
              <div className="font-medium">{r.st.name}</div>
              <div className="text-xs text-slate-500">{r.c.name} · PH {r.st.parent_phone || '—'}</div>
            </div>
            <div className="text-right">
              <div className="font-semibold">{vnd(r.p?.amount ?? r.c.fee)}</div>
              <span className={`rounded-full px-2 py-0.5 text-xs ${r.p ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{r.p ? 'Đã đóng ' + fmtDate(r.p.paid_at) : 'Còn nợ'}</span>
            </div>
            <div className="flex gap-1 w-full sm:w-auto justify-end items-center">
              {!r.p ? (
                <>
                  <button className="bg-indigo-600 text-white rounded-lg px-3 py-1.5 text-xs font-medium" onClick={() => setOpen({ kind: 'qr', key: r.key })}>Mã QR</button>
                  <button className="border rounded-lg px-3 py-1.5 text-xs" onClick={() => act.pay(r, month, 'cash')}>Tiền mặt</button>
                </>
              ) : (
                <>
                  <button className="border rounded-lg px-3 py-1.5 text-xs text-indigo-600" onClick={() => setOpen({ kind: 'receipt', key: r.key })}>Biên lai</button>
                  <button className="text-slate-400 text-xs px-1" onClick={async () => (await confirm('Hoàn tác khoản đã thu?', { ok: 'Hoàn tác' })) && act.unpay(r.p!.id)}>Hoàn tác</button>
                </>
              )}
            </div>
          </div>
        ))}
        {!rows.length && <Empty>{all.length ? 'Không có khoản thu nào khớp bộ lọc.' : 'Chưa có học sinh nào được ghi danh vào lớp trong tháng này.'}</Empty>}
      </div>

      {/* QR */}
      <Modal open={open?.kind === 'qr' && !!target} onClose={() => setOpen(null)} maxW="md:max-w-sm">
        {target && s && (
          <div className="text-center">
            <h2 className="font-bold text-base">QR học phí · {target.st.name}</h2>
            <p className="text-xs text-slate-500 mb-2">{target.c.name} · tháng {month.slice(5)}/{month.slice(0, 4)}</p>
            {s.account ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrUrl(s, payCode(target.st.id, target.c.id, month), target.c.fee)} alt="QR chuyển khoản" className="mx-auto w-64 h-auto border rounded" />
            ) : <p className="text-sm text-amber-600 border rounded p-3">Chưa cài số tài khoản nhận tiền. Bấm &quot;⚙ Tài khoản nhận tiền&quot; để nhập.</p>}
            <div className="text-left text-xs mt-3 space-y-1 bg-slate-50 rounded p-2">
              <div>Ngân hàng: <b>{s.bank}</b> · STK: <b>{s.account || '—'}</b></div>
              <div>Chủ TK: <b>{s.account_name || '—'}</b></div>
              <div>Số tiền: <b>{vnd(target.c.fee)}</b></div>
              <div>Nội dung: <b className="font-mono">{payCode(target.st.id, target.c.id, month)}</b>
                <button className="text-indigo-600 ml-1" onClick={() => { navigator.clipboard?.writeText(payCode(target.st.id, target.c.id, month)); toast('Đã copy nội dung') }}>Copy</button></div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Khi phụ huynh chuyển khoản, bấm &quot;Đã nhận tiền&quot; để ghi nhận. (Tự động đối soát ngân hàng sẽ làm sau.)</p>
            <div className="flex justify-end gap-2 mt-3">
              <button className="px-3 py-1.5 rounded border" onClick={() => setOpen(null)}>Đóng</button>
              <button className="px-3 py-1.5 rounded bg-emerald-600 text-white" onClick={async () => { if ((await act.pay(target, month, 'bank')).ok) setOpen(null) }}>Đã nhận tiền</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Biên lai */}
      <Modal open={open?.kind === 'receipt' && !!target?.p} onClose={() => setOpen(null)} maxW="md:max-w-sm">
        {target?.p && (
          <div>
            <div id="receipt" className="bg-white">
              <div className="text-center mb-3">
                <div className="font-bold text-base">{me.orgName}</div>
                <div className="font-bold">BIÊN LAI THU HỌC PHÍ</div>
                <div className="text-xs text-slate-500">Số: {target.p.id.slice(0, 8).toUpperCase()} · Ngày {fmtDate(target.p.paid_at)}</div>
              </div>
              <div className="space-y-1">
                <div>Học sinh: <b>{target.st.name}</b></div>
                <div>Phụ huynh: {target.st.parent_name || '—'}</div>
                <div>Lớp: {target.c.name}</div>
                <div>Kỳ thu: Tháng {target.p.period.slice(5)}/{target.p.period.slice(0, 4)}</div>
                <div>Hình thức: {target.p.method === 'bank' ? 'Chuyển khoản' : 'Tiền mặt'}</div>
                <div className="text-lg pt-2">Số tiền: <b>{vnd(target.p.amount)}</b></div>
              </div>
              <div className="flex justify-between mt-6 text-xs text-slate-500"><span>Người nộp</span><span>Người thu</span></div>
              <div className="h-12" />
            </div>
            <div className="flex justify-end gap-2 no-print">
              <button className="px-3 py-1.5 rounded border" onClick={() => setOpen(null)}>Đóng</button>
              <button className="px-4 py-1.5 rounded bg-indigo-600 text-white" onClick={() => window.print()}>In biên lai</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cài đặt tài khoản */}
      <Modal open={settings && !!draftSet} onClose={() => setSettings(false)} maxW="md:max-w-sm">
        {draftSet && (
          <div>
            <h2 className="font-bold text-base mb-3">Tài khoản nhận học phí</h2>
            <label className="block mb-2"><span className="text-xs text-slate-500">Ngân hàng</span>
              <select className="w-full border rounded px-2 py-1.5 bg-white" value={draftSet.bank} onChange={(e) => setDraftSet({ ...draftSet, bank: e.target.value })}>
                {BANKS.map((b) => <option key={b}>{b}</option>)}
              </select></label>
            <label className="block mb-2"><span className="text-xs text-slate-500">Số tài khoản</span>
              <input className="w-full border rounded px-2 py-1.5" value={draftSet.account} onChange={(e) => setDraftSet({ ...draftSet, account: e.target.value.trim() })} /></label>
            <label className="block mb-2"><span className="text-xs text-slate-500">Tên chủ tài khoản (không dấu, viết hoa)</span>
              <input className="w-full border rounded px-2 py-1.5" value={draftSet.account_name} onChange={(e) => setDraftSet({ ...draftSet, account_name: e.target.value.toUpperCase() })} /></label>
            <div className="flex justify-end gap-2 mt-3">
              <button className="px-3 py-1.5 rounded border" onClick={() => setSettings(false)}>Hủy</button>
              <button className="px-4 py-1.5 rounded bg-indigo-600 text-white" onClick={async () => { if ((await sact.update(draftSet)).ok) setSettings(false) }}>Lưu</button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}
