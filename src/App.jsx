import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// ─── Constants ───────────────────────────────────────────────────────────────
const ADMIN_PW = import.meta.env.VITE_ADMIN_PASSWORD || 'admin1234'
const PURPOSES = ['현장방문', '자재구매', '고객미팅', '관공서방문', '직원이동', '차량점검', '기타']

// ─── Helpers ─────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().split('T')[0] }
function nowTime() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
}
function fmtMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `${y}년 ${parseInt(m)}월`
}
function fmtNum(n) { return new Intl.NumberFormat('ko-KR').format(Math.round(n)) }

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.type === 'success' ? '✓' : '✕'}</span>
          <span>{t.msg}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Nav ─────────────────────────────────────────────────────────────────────
function Nav({ view, onAdminClick, onLogoClick }) {
  return (
    <nav className="nav">
      <button className="nav-logo" onClick={onLogoClick} style={{ background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
        <div className="nav-logo-icon">🚗</div>
        <div>
          <div className="nav-logo-text">운행일지</div>
          <div className="nav-logo-sub">법인차량 관리시스템</div>
        </div>
      </button>
      {view !== 'admin' && (
        <button className="nav-btn" onClick={onAdminClick}>
          🔐 관리자
        </button>
      )}
      {view === 'admin' && (
        <button className="nav-btn" onClick={onLogoClick}>
          ✏️ 입력하기
        </button>
      )}
    </nav>
  )
}

// ─── Confirm Modal ───────────────────────────────────────────────────────────
function ConfirmModal({ msg, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-title">삭제 확인</div>
        <div className="modal-desc">{msg}</div>
        <div className="modal-actions">
          <button className="btn btn-secondary btn-sm" onClick={onCancel}>취소</button>
          <button className="btn btn-danger btn-sm" onClick={onConfirm}>삭제</button>
        </div>
      </div>
    </div>
  )
}

// ─── Log Form ────────────────────────────────────────────────────────────────
function LogForm({ addToast }) {
  const initForm = useCallback(() => ({
    date: todayStr(),
    driver: '',
    car_num: '',
    start_time: nowTime(),
    end_time: '',
    from_location: '',
    to_location: '',
    start_km: '',
    end_km: '',
    purpose: '',
    note: '',
  }), [])

  const [form, setForm] = useState(initForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: false }))
  }

  const distance = form.start_km !== '' && form.end_km !== '' &&
    parseFloat(form.end_km) >= parseFloat(form.start_km)
    ? (parseFloat(form.end_km) - parseFloat(form.start_km)).toFixed(1)
    : null

  const validate = () => {
    const required = ['date', 'driver', 'car_num', 'from_location', 'to_location', 'purpose']
    const errs = {}
    required.forEach(k => { if (!form[k]?.trim()) errs[k] = true })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) {
      addToast('필수 항목을 모두 입력해주세요.', 'error')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        start_km: form.start_km ? parseFloat(form.start_km) : null,
        end_km: form.end_km ? parseFloat(form.end_km) : null,
        distance: distance ? parseFloat(distance) : null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        note: form.note || null,
      }
      const { error } = await supabase.from('vehicle_logs').insert([payload])
      if (error) throw error
      addToast('운행일지가 저장되었습니다! ✓', 'success')
      setForm(prev => ({
        ...initForm(),
        driver: prev.driver,
        car_num: prev.car_num,
        start_km: prev.end_km,
        start_time: nowTime(),
      }))
      setErrors({})
    } catch (e) {
      addToast('저장에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error')
      console.error(e)
    }
    setSaving(false)
  }

  const ic = (k) => errors[k] ? 'input error' : 'input'

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">운행일지 입력</div>
        <div className="page-desc">운행 완료 후 즉시 입력해주세요.</div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="form-section">

            {/* 기본 정보 */}
            <div className="section-label">기본 정보</div>
            <div className="grid-2">
              <div className="field">
                <label className="label label-required">날짜</label>
                <input type="date" className={ic('date')} value={form.date}
                  onChange={e => set('date', e.target.value)} />
              </div>
              <div className="field">
                <label className="label label-required">차량번호</label>
                <input type="text" className={ic('car_num')} placeholder="12가 3456"
                  value={form.car_num} onChange={e => set('car_num', e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label className="label label-required">운전자</label>
              <input type="text" className={ic('driver')} placeholder="홍길동"
                value={form.driver} onChange={e => set('driver', e.target.value)} />
            </div>

            <hr className="divider" />

            {/* 운행 경로 */}
            <div className="section-label">운행 경로</div>
            <div className="grid-2">
              <div className="field">
                <label className="label">출발 시각</label>
                <input type="time" className="input" value={form.start_time}
                  onChange={e => set('start_time', e.target.value)} />
              </div>
              <div className="field">
                <label className="label">도착 시각</label>
                <input type="time" className="input" value={form.end_time}
                  onChange={e => set('end_time', e.target.value)} />
              </div>
            </div>

            <div className="grid-2">
              <div className="field">
                <label className="label label-required">출발지</label>
                <input type="text" className={ic('from_location')} placeholder="회사"
                  value={form.from_location} onChange={e => set('from_location', e.target.value)} />
              </div>
              <div className="field">
                <label className="label label-required">목적지</label>
                <input type="text" className={ic('to_location')} placeholder="현장명"
                  value={form.to_location} onChange={e => set('to_location', e.target.value)} />
              </div>
            </div>

            <div>
              <div className="grid-2">
                <div className="field">
                  <label className="label">출발 km</label>
                  <input type="number" className="input" placeholder="예: 15420" min="0"
                    value={form.start_km} onChange={e => set('start_km', e.target.value)} />
                </div>
                <div className="field">
                  <label className="label">도착 km</label>
                  <input type="number" className="input" placeholder="예: 15487" min="0"
                    value={form.end_km} onChange={e => set('end_km', e.target.value)} />
                </div>
              </div>
              {distance !== null && (
                <div className="distance-badge" style={{ marginTop: 10 }}>
                  📍 주행거리 {distance} km
                </div>
              )}
            </div>

            <hr className="divider" />

            {/* 운행 목적 */}
            <div className="section-label">운행 목적</div>
            <div className="field">
              <label className="label label-required">목적 분류</label>
              <select className={ic('purpose').replace('input','select')}
                value={form.purpose} onChange={e => set('purpose', e.target.value)}>
                <option value="">선택하세요</option>
                {PURPOSES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="field">
              <label className="label">비고 <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(선택)</span></label>
              <input type="text" className="input" placeholder="추가 메모"
                value={form.note} onChange={e => set('note', e.target.value)} />
            </div>

          </div>
        </div>

        <div style={{ padding:'0 1.5rem 1.5rem' }}>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner"></span> 저장 중...</> : '💾 운행일지 저장'}
          </button>
        </div>
      </div>

      <p style={{ textAlign:'center', fontSize:12, color:'var(--gray-400)', marginTop:'1rem' }}>
        저장된 데이터는 관리자 화면에서 확인하실 수 있습니다.
      </p>
    </div>
  )
}

// ─── Admin Login ─────────────────────────────────────────────────────────────
function AdminLogin({ onLogin, onBack }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)

  const check = () => {
    if (pw === ADMIN_PW) { onLogin() }
    else { setErr(true); setPw('') }
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="card">
          <div className="card-body">
            <div className="login-icon">🔐</div>
            <div className="page-title" style={{ fontSize:20, marginBottom:4 }}>관리자 로그인</div>
            <div className="page-desc" style={{ marginBottom:'1.5rem' }}>운행 기록 열람 권한이 필요합니다.</div>

            <div className="form-section">
              <div className="field">
                <label className="label">비밀번호</label>
                <input type="password" className={err ? 'input error' : 'input'}
                  placeholder="관리자 비밀번호 입력"
                  value={pw}
                  onChange={e => { setPw(e.target.value); setErr(false) }}
                  onKeyDown={e => e.key === 'Enter' && check()}
                  autoFocus />
                {err && <span className="error-msg">비밀번호가 올바르지 않습니다.</span>}
              </div>
              <button className="btn btn-primary btn-full" onClick={check}>확인</button>
              <button className="btn btn-secondary btn-full" onClick={onBack}>← 입력 화면으로</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Admin Dashboard ─────────────────────────────────────────────────────────
function AdminDashboard({ addToast }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterPurpose, setFilterPurpose] = useState('')
  const [confirmId, setConfirmId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('vehicle_logs')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (!error) setRecords(data || [])
    else addToast('데이터 로드에 실패했습니다.', 'error')
    setLoading(false)
  }, [addToast])

  useEffect(() => { load() }, [load])

  const filtered = records.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !search || [r.driver, r.car_num, r.from_location, r.to_location, r.note]
      .some(v => v?.toLowerCase().includes(q))
    const matchMonth = !filterMonth || (r.date || '').startsWith(filterMonth)
    const matchPurpose = !filterPurpose || r.purpose === filterPurpose
    return matchSearch && matchMonth && matchPurpose
  })

  const thisMonth = todayStr().substring(0, 7)
  const thisMonthRec = records.filter(r => (r.date || '').startsWith(thisMonth))
  const totalKm = records.reduce((s, r) => s + (r.distance || 0), 0)
  const thisMonthKm = thisMonthRec.reduce((s, r) => s + (r.distance || 0), 0)

  const months = [...new Set(records.map(r => (r.date || '').substring(0, 7)))]
    .filter(Boolean).sort().reverse()

  const monthGroups = filtered.reduce((acc, r) => {
    const m = (r.date || '').substring(0, 7)
    if (!acc[m]) acc[m] = []
    acc[m].push(r)
    return acc
  }, {})

  const handleDelete = async () => {
    const { error } = await supabase.from('vehicle_logs').delete().eq('id', confirmId)
    if (!error) {
      setRecords(prev => prev.filter(r => r.id !== confirmId))
      addToast('삭제되었습니다.', 'success')
    } else {
      addToast('삭제에 실패했습니다.', 'error')
    }
    setConfirmId(null)
  }

  const exportCSV = () => {
    const headers = ['날짜','운전자','차량번호','출발시각','도착시각','출발지','목적지','출발km','도착km','주행거리(km)','운행목적','비고']
    const rows = filtered.map(r => [
      r.date, r.driver, r.car_num, r.start_time || '', r.end_time || '',
      r.from_location, r.to_location,
      r.start_km ?? '', r.end_km ?? '', r.distance ?? '',
      r.purpose, r.note || ''
    ])
    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `법인차량운행일지_${todayStr()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    addToast('CSV 파일이 다운로드됩니다.', 'success')
  }

  return (
    <div className="page-wide">
      {confirmId && (
        <ConfirmModal
          msg="이 운행 기록을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다."
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}

      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div className="page-title">운행 기록 현황</div>
          <div className="page-desc">전체 법인차량 운행 내역을 확인합니다.</div>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV}>
          📥 CSV 내보내기
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">이번달 운행 건수</div>
          <div className="stat-value">{thisMonthRec.length}<span style={{ fontSize:14, fontWeight:500, color:'var(--gray-500)', marginLeft:4 }}>건</span></div>
          <div className="stat-sub">{fmtMonth(thisMonth)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">이번달 주행거리</div>
          <div className="stat-value">{fmtNum(thisMonthKm)}<span style={{ fontSize:14, fontWeight:500, color:'var(--gray-500)', marginLeft:4 }}>km</span></div>
          <div className="stat-sub">{fmtMonth(thisMonth)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">전체 운행 건수</div>
          <div className="stat-value">{records.length}<span style={{ fontSize:14, fontWeight:500, color:'var(--gray-500)', marginLeft:4 }}>건</span></div>
          <div className="stat-sub">누적 합계</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">전체 주행거리</div>
          <div className="stat-value">{fmtNum(totalKm)}<span style={{ fontSize:14, fontWeight:500, color:'var(--gray-500)', marginLeft:4 }}>km</span></div>
          <div className="stat-sub">누적 합계</div>
        </div>
      </div>

      {/* Filters */}
      <div className="toolbar">
        <div className="toolbar-left search-wrap">
          <span className="search-icon">🔍</span>
          <input type="text" className="input search-input" placeholder="운전자, 차량번호, 목적지 검색"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select" style={{ width:'auto', height:42, minWidth:130 }}
          value={filterMonth} onChange={e => setFilterMonth(e.target.value)}>
          <option value="">전체 월</option>
          {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
        </select>
        <select className="select" style={{ width:'auto', height:42, minWidth:120 }}
          value={filterPurpose} onChange={e => setFilterPurpose(e.target.value)}>
          <option value="">전체 목적</option>
          {PURPOSES.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Records */}
      {loading ? (
        <div className="empty">
          <div className="empty-icon">⏳</div>
          <div className="empty-text">불러오는 중...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <div className="empty-text">{search || filterMonth || filterPurpose ? '검색 결과가 없습니다.' : '저장된 운행 기록이 없습니다.'}</div>
          <div className="empty-sub">조건을 변경하거나 직원들에게 입력을 요청해주세요.</div>
        </div>
      ) : (
        Object.keys(monthGroups).sort().reverse().map(m => {
          const grp = monthGroups[m]
          const mKm = grp.reduce((s, r) => s + (r.distance || 0), 0)
          return (
            <div key={m} className="month-group">
              <div className="month-header">
                <span className="month-title">{fmtMonth(m)}</span>
                <span className="month-meta">{grp.length}건 · {fmtNum(mKm)}km</span>
              </div>
              <div className="record-list">
                {grp.map(r => (
                  <div key={r.id} className="record-card">
                    <div className="record-row">
                      <span className="record-driver">{r.driver}</span>
                      <span className="badge badge-car">{r.car_num}</span>
                      <span className="badge badge-purpose">{r.purpose}</span>
                      <span className="record-date">{r.date}</span>
                      <button className="record-delete-btn" onClick={() => setConfirmId(r.id)} title="삭제">✕</button>
                    </div>
                    <div className="record-route">
                      <span>{r.from_location}</span>
                      <span className="record-route-arrow">→</span>
                      <span>{r.to_location}</span>
                    </div>
                    <div className="record-meta">
                      {r.distance != null && <span className="record-km">📍 {r.distance}km</span>}
                      {r.start_time && (
                        <span>{r.start_time}{r.end_time ? ` ~ ${r.end_time}` : ''}</span>
                      )}
                      {r.start_km != null && r.end_km != null && (
                        <span>{fmtNum(r.start_km)}km → {fmtNum(r.end_km)}km</span>
                      )}
                    </div>
                    {r.note && <div className="record-note">📝 {r.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('form')
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now()
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500)
  }, [])

  return (
    <>
      <Nav
        view={view}
        onAdminClick={() => setView('admin-login')}
        onLogoClick={() => setView('form')}
      />
      {view === 'form' && <LogForm addToast={addToast} />}
      {view === 'admin-login' && (
        <AdminLogin
          onLogin={() => setView('admin')}
          onBack={() => setView('form')}
        />
      )}
      {view === 'admin' && <AdminDashboard addToast={addToast} />}
      <Toast toasts={toasts} />
    </>
  )
}
