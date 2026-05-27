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
          <div className="nav-logo-text">(주)컴퍼니04</div>
          <div className="nav-logo-sub">차량운행일지</div>
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

// ─── 출발 입력 폼 ─────────────────────────────────────────────────────────────
function DepartForm({ addToast, onComplete }) {
  const [form, setForm] = useState({
    date: todayStr(),
    driver: '',
    car_num: '',
    start_time: nowTime(),
    from_location: '',
    start_km: '',
    purpose: '',
    note: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: false }))
  }

  const validate = () => {
    const required = ['date', 'driver', 'car_num', 'from_location', 'purpose']
    const errs = {}
    required.forEach(k => { if (!form[k]?.trim()) errs[k] = true })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) { addToast('필수 항목을 모두 입력해주세요.', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ...form,
        start_km: form.start_km ? parseFloat(form.start_km) : null,
        start_time: form.start_time || null,
        note: form.note || null,
        status: 'driving', // 운행중
        to_location: null,
        end_time: null,
        end_km: null,
        distance: null,
      }
      const { data, error } = await supabase.from('vehicle_logs').insert([payload]).select().single()
      if (error) throw error
      addToast('출발 기록 저장! 도착 후 완료해주세요. 🚗', 'success')
      onComplete(data)
    } catch (e) {
      addToast('저장에 실패했습니다. 다시 시도해주세요.', 'error')
      console.error(e)
    }
    setSaving(false)
  }

  const ic = k => errors[k] ? 'input error' : 'input'
  const sc = k => errors[k] ? 'select error' : 'select'

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">출발 기록</div>
        <div className="page-desc">출발 전에 아래 정보를 입력해주세요.</div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="form-section">
            <div className="section-label">기본 정보</div>
            <div className="grid-2">
              <div className="field">
                <label className="label label-required">날짜</label>
                <input type="date" className={ic('date')} value={form.date} onChange={e => set('date', e.target.value)} />
              </div>
              <div className="field">
                <label className="label label-required">차량번호</label>
                <input type="text" className={ic('car_num')} placeholder="12가 3456" value={form.car_num} onChange={e => set('car_num', e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label className="label label-required">운전자</label>
              <input type="text" className={ic('driver')} placeholder="홍길동" value={form.driver} onChange={e => set('driver', e.target.value)} />
            </div>

            <hr className="divider" />
            <div className="section-label">출발 정보</div>

            <div className="grid-2">
              <div className="field">
                <label className="label">출발 시각</label>
                <input type="time" className="input" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
              </div>
              <div className="field">
                <label className="label label-required">출발지</label>
                <input type="text" className={ic('from_location')} placeholder="회사" value={form.from_location} onChange={e => set('from_location', e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label className="label">출발 계기판 km</label>
              <input type="number" className="input" placeholder="예: 15420" min="0" value={form.start_km} onChange={e => set('start_km', e.target.value)} />
            </div>

            <hr className="divider" />
            <div className="section-label">운행 목적</div>

            <div className="field">
              <label className="label label-required">목적 분류</label>
              <select className={sc('purpose')} value={form.purpose} onChange={e => set('purpose', e.target.value)}>
                <option value="">선택하세요</option>
                {PURPOSES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="field">
              <label className="label">비고 <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(선택)</span></label>
              <input type="text" className="input" placeholder="추가 메모" value={form.note} onChange={e => set('note', e.target.value)} />
            </div>
          </div>
        </div>
        <div style={{ padding:'0 1.5rem 1.5rem' }}>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner"></span> 저장 중...</> : '🚗 출발 기록 저장'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 도착 완료 폼 ─────────────────────────────────────────────────────────────
function ArriveForm({ record, addToast, onDone }) {
  const [form, setForm] = useState({
    end_time: nowTime(),
    to_location: '',
    end_km: '',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v }))
    setErrors(p => ({ ...p, [k]: false }))
  }

  const distance = form.end_km !== '' && record.start_km != null &&
    parseFloat(form.end_km) >= record.start_km
    ? (parseFloat(form.end_km) - record.start_km).toFixed(1)
    : null

  const validate = () => {
    const errs = {}
    if (!form.to_location?.trim()) errs.to_location = true
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) { addToast('목적지를 입력해주세요.', 'error'); return }
    setSaving(true)
    try {
      const updates = {
        end_time: form.end_time || null,
        to_location: form.to_location,
        end_km: form.end_km ? parseFloat(form.end_km) : null,
        distance: distance ? parseFloat(distance) : null,
        status: 'done',
      }
      const { error } = await supabase.from('vehicle_logs').update(updates).eq('id', record.id)
      if (error) throw error
      addToast('운행일지 완료! ✓', 'success')
      onDone()
    } catch (e) {
      addToast('저장에 실패했습니다. 다시 시도해주세요.', 'error')
      console.error(e)
    }
    setSaving(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">도착 완료</div>
        <div className="page-desc">도착 후 아래 정보를 입력해주세요.</div>
      </div>

      {/* 출발 정보 요약 */}
      <div className="card" style={{ marginBottom: 12 }}>
        <div className="card-body">
          <div className="section-label" style={{ marginBottom: 10 }}>출발 정보 확인</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, fontSize:14 }}>
            <div>
              <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:2 }}>운전자</div>
              <div style={{ fontWeight:600 }}>{record.driver}</div>
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:2 }}>차량번호</div>
              <div style={{ fontWeight:600 }}>{record.car_num}</div>
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:2 }}>출발지</div>
              <div>{record.from_location}</div>
            </div>
            <div>
              <div style={{ fontSize:11, color:'var(--gray-400)', marginBottom:2 }}>출발 km</div>
              <div>{record.start_km != null ? `${fmtNum(record.start_km)} km` : '-'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="form-section">
            <div className="section-label">도착 정보</div>

            <div className="grid-2">
              <div className="field">
                <label className="label">도착 시각</label>
                <input type="time" className="input" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
              </div>
              <div className="field">
                <label className="label label-required">목적지</label>
                <input type="text" className={errors.to_location ? 'input error' : 'input'} placeholder="현장명" value={form.to_location} onChange={e => set('to_location', e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label className="label">도착 계기판 km</label>
              <input type="number" className="input" placeholder="예: 15487" min="0" value={form.end_km} onChange={e => set('end_km', e.target.value)} />
            </div>

            {distance !== null && (
              <div className="distance-badge">
                📍 주행거리 {distance} km
              </div>
            )}
          </div>
        </div>
        <div style={{ padding:'0 1.5rem 1.5rem' }}>
          <button className="btn btn-primary btn-full" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner"></span> 저장 중...</> : '✅ 도착 완료'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 운행중 기록 목록 (도착 완료 대기) ───────────────────────────────────────
function DrivingList({ addToast, onSelect, onNewDepart }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [driver, setDriver] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('vehicle_logs')
      .select('*')
      .eq('status', 'driving')
      .order('created_at', { ascending: false })
    setRecords(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = driver
    ? records.filter(r => r.driver?.includes(driver) || r.car_num?.includes(driver))
    : records

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">도착 완료 입력</div>
        <div className="page-desc">운행 중인 기록을 선택해주세요.</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <input type="text" className="input" placeholder="이름 또는 차량번호로 검색"
          value={driver} onChange={e => setDriver(e.target.value)} />
      </div>

      {loading ? (
        <div className="empty"><div className="empty-icon">⏳</div><div className="empty-text">불러오는 중...</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">🚗</div>
          <div className="empty-text">운행 중인 기록이 없습니다.</div>
          <div className="empty-sub" style={{ marginTop:16 }}>
            <button className="btn btn-primary" onClick={onNewDepart}>출발 기록 입력하기</button>
          </div>
        </div>
      ) : (
        <div className="record-list">
          {filtered.map(r => (
            <div key={r.id} className="record-card" style={{ cursor:'pointer' }} onClick={() => onSelect(r)}>
              <div className="record-row">
                <span className="record-driver">{r.driver}</span>
                <span className="badge badge-car">{r.car_num}</span>
                <span className="badge" style={{ background:'#FEF9C3', color:'#854D0E', border:'1px solid #FDE047' }}>운행중</span>
                <span className="record-date">{r.date}</span>
              </div>
              <div className="record-route">
                <span>{r.from_location}</span>
                <span className="record-route-arrow">→</span>
                <span style={{ color:'var(--gray-400)' }}>목적지 미입력</span>
              </div>
              <div className="record-meta">
                {r.start_km != null && <span>출발 {fmtNum(r.start_km)}km</span>}
                {r.start_time && <span>{r.start_time} 출발</span>}
                <span style={{ color:'var(--blue)', marginLeft:'auto', fontSize:13, fontWeight:600 }}>탭하여 완료 →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── 메인 입력 화면 (탭) ──────────────────────────────────────────────────────
function LogMain({ addToast }) {
  const [tab, setTab] = useState('depart') // 'depart' | 'arrive'
  const [departedRecord, setDepartedRecord] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)

  if (departedRecord) {
    return <ArriveForm record={departedRecord} addToast={addToast} onDone={() => { setDepartedRecord(null); setTab('arrive') }} />
  }
  if (selectedRecord) {
    return <ArriveForm record={selectedRecord} addToast={addToast} onDone={() => { setSelectedRecord(null); setTab('arrive') }} />
  }

  return (
    <div>
      {/* 탭 */}
      <div style={{ background:'var(--white)', borderBottom:'1px solid var(--gray-200)', display:'flex' }}>
        <button
          onClick={() => setTab('depart')}
          style={{
            flex:1, height:48, border:'none', background:'none', fontSize:14, fontWeight: tab==='depart' ? 700 : 400,
            color: tab==='depart' ? 'var(--blue)' : 'var(--gray-500)',
            borderBottom: tab==='depart' ? '2px solid var(--blue)' : '2px solid transparent',
            cursor:'pointer', fontFamily:'inherit'
          }}
        >
          🚗 출발 기록
        </button>
        <button
          onClick={() => setTab('arrive')}
          style={{
            flex:1, height:48, border:'none', background:'none', fontSize:14, fontWeight: tab==='arrive' ? 700 : 400,
            color: tab==='arrive' ? 'var(--blue)' : 'var(--gray-500)',
            borderBottom: tab==='arrive' ? '2px solid var(--blue)' : '2px solid transparent',
            cursor:'pointer', fontFamily:'inherit'
          }}
        >
          ✅ 도착 완료
        </button>
      </div>

      {tab === 'depart' && (
        <DepartForm addToast={addToast} onComplete={rec => setDepartedRecord(rec)} />
      )}
      {tab === 'arrive' && (
        <DrivingList addToast={addToast} onSelect={rec => setSelectedRecord(rec)} onNewDepart={() => setTab('depart')} />
      )}
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

// ─── Edit Modal ──────────────────────────────────────────────────────────────
function EditModal({ record, onSave, onCancel }) {
  const [form, setForm] = useState({
    date: record.date || '',
    driver: record.driver || '',
    car_num: record.car_num || '',
    start_time: record.start_time || '',
    end_time: record.end_time || '',
    from_location: record.from_location || '',
    to_location: record.to_location || '',
    start_km: record.start_km ?? '',
    end_km: record.end_km ?? '',
    purpose: record.purpose || '',
    note: record.note || '',
    status: record.status || 'done',
  })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const distance = form.start_km !== '' && form.end_km !== '' &&
    parseFloat(form.end_km) >= parseFloat(form.start_km)
    ? (parseFloat(form.end_km) - parseFloat(form.start_km)).toFixed(1)
    : null

  const handleSave = async () => {
    setSaving(true)
    const updates = {
      ...form,
      start_km: form.start_km !== '' ? parseFloat(form.start_km) : null,
      end_km: form.end_km !== '' ? parseFloat(form.end_km) : null,
      distance: distance ? parseFloat(distance) : null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      to_location: form.to_location || null,
      note: form.note || null,
    }
    await onSave(record.id, updates)
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" style={{ maxWidth:520, width:'100%', maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ marginBottom:16 }}>✏️ 운행 기록 수정</div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <div className="section-label">기본 정보</div>
          <div className="grid-2">
            <div className="field">
              <label className="label">날짜</label>
              <input type="date" className="input" value={form.date} onChange={e => set('date', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">차량번호</label>
              <input type="text" className="input" value={form.car_num} onChange={e => set('car_num', e.target.value)} />
            </div>
          </div>
          <div className="field">
            <label className="label">운전자</label>
            <input type="text" className="input" value={form.driver} onChange={e => set('driver', e.target.value)} />
          </div>

          <div className="section-label" style={{ marginTop:4 }}>운행 경로</div>
          <div className="grid-2">
            <div className="field">
              <label className="label">출발 시각</label>
              <input type="time" className="input" value={form.start_time} onChange={e => set('start_time', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">도착 시각</label>
              <input type="time" className="input" value={form.end_time} onChange={e => set('end_time', e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label">출발지</label>
              <input type="text" className="input" value={form.from_location} onChange={e => set('from_location', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">목적지</label>
              <input type="text" className="input" value={form.to_location} onChange={e => set('to_location', e.target.value)} />
            </div>
          </div>
          <div className="grid-2">
            <div className="field">
              <label className="label">출발 km</label>
              <input type="number" className="input" value={form.start_km} onChange={e => set('start_km', e.target.value)} />
            </div>
            <div className="field">
              <label className="label">도착 km</label>
              <input type="number" className="input" value={form.end_km} onChange={e => set('end_km', e.target.value)} />
            </div>
          </div>
          {distance !== null && (
            <div className="distance-badge">📍 주행거리 {distance} km</div>
          )}

          <div className="section-label" style={{ marginTop:4 }}>운행 목적</div>
          <div className="field">
            <label className="label">목적 분류</label>
            <select className="select" value={form.purpose} onChange={e => set('purpose', e.target.value)}>
              <option value="">선택하세요</option>
              {PURPOSES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="label">상태</label>
            <select className="select" value={form.status} onChange={e => set('status', e.target.value)}>
              <option value="done">완료</option>
              <option value="driving">운행중</option>
            </select>
          </div>
          <div className="field">
            <label className="label">비고</label>
            <input type="text" className="input" placeholder="추가 메모" value={form.note} onChange={e => set('note', e.target.value)} />
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop:20 }}>
          <button className="btn btn-secondary" onClick={onCancel}>취소</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><span className="spinner"></span> 저장 중...</> : '저장'}
          </button>
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
  const [filterStatus, setFilterStatus] = useState('')
  const [confirmId, setConfirmId] = useState(null)
  const [editRecord, setEditRecord] = useState(null)

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
    const matchStatus = !filterStatus || r.status === filterStatus
    return matchSearch && matchMonth && matchPurpose && matchStatus
  })

  const thisMonth = todayStr().substring(0, 7)
  const thisMonthRec = records.filter(r => (r.date || '').startsWith(thisMonth) && r.status === 'done')
  const totalKm = records.filter(r => r.status === 'done').reduce((s, r) => s + (r.distance || 0), 0)
  const thisMonthKm = thisMonthRec.reduce((s, r) => s + (r.distance || 0), 0)
  const drivingCount = records.filter(r => r.status === 'driving').length

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

  const handleEdit = async (id, updates) => {
    const { error } = await supabase.from('vehicle_logs').update(updates).eq('id', id)
    if (!error) {
      setRecords(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
      addToast('수정되었습니다. ✓', 'success')
      setEditRecord(null)
    } else {
      addToast('수정에 실패했습니다.', 'error')
    }
  }

  const exportCSV = () => {
    const headers = ['날짜','운전자','차량번호','출발시각','도착시각','출발지','목적지','출발km','도착km','주행거리(km)','운행목적','상태','비고']
    const rows = filtered.map(r => [
      r.date, r.driver, r.car_num, r.start_time || '', r.end_time || '',
      r.from_location, r.to_location || '미완료', r.start_km ?? '', r.end_km ?? '',
      r.distance ?? '', r.purpose, r.status === 'done' ? '완료' : '운행중', r.note || ''
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
      {editRecord && (
        <EditModal
          record={editRecord}
          onSave={handleEdit}
          onCancel={() => setEditRecord(null)}
        />
      )}

      <div className="page-header" style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
        <div>
          <div className="page-title">운행 기록 현황</div>
          <div className="page-desc">전체 법인차량 운행 내역을 확인합니다.</div>
        </div>
        <button className="btn btn-secondary" onClick={exportCSV}>📥 CSV 내보내기</button>
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
          <div className="stat-label">현재 운행중</div>
          <div className="stat-value" style={{ color: drivingCount > 0 ? 'var(--amber)' : 'var(--gray-900)' }}>
            {drivingCount}<span style={{ fontSize:14, fontWeight:500, color:'var(--gray-500)', marginLeft:4 }}>건</span>
          </div>
          <div className="stat-sub">도착 완료 대기</div>
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
        <select className="select" style={{ width:'auto', height:42, minWidth:110 }}
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">전체 상태</option>
          <option value="done">완료</option>
          <option value="driving">운행중</option>
        </select>
        <select className="select" style={{ width:'auto', height:42, minWidth:120 }}
          value={filterPurpose} onChange={e => setFilterPurpose(e.target.value)}>
          <option value="">전체 목적</option>
          {PURPOSES.map(p => <option key={p}>{p}</option>)}
        </select>
      </div>

      {/* Records */}
      {loading ? (
        <div className="empty"><div className="empty-icon">⏳</div><div className="empty-text">불러오는 중...</div></div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">📋</div>
          <div className="empty-text">{search || filterMonth || filterPurpose ? '검색 결과가 없습니다.' : '저장된 운행 기록이 없습니다.'}</div>
        </div>
      ) : (
        Object.keys(monthGroups).sort().reverse().map(m => {
          const grp = monthGroups[m]
          const mKm = grp.filter(r => r.status === 'done').reduce((s, r) => s + (r.distance || 0), 0)
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
                      {r.status === 'driving' && (
                        <span className="badge" style={{ background:'#FEF9C3', color:'#854D0E', border:'1px solid #FDE047' }}>운행중</span>
                      )}
                      <span className="record-date">{r.date}</span>
                      <button
                        onClick={() => setEditRecord(r)}
                        title="수정"
                        style={{ background:'none', border:'none', cursor:'pointer', color:'var(--gray-400)', fontSize:14, padding:'2px 4px', marginLeft:'auto', transition:'color 0.15s' }}
                        onMouseOver={e => e.target.style.color='var(--blue)'}
                        onMouseOut={e => e.target.style.color='var(--gray-400)'}
                      >✏️</button>
                      <button className="record-delete-btn" onClick={() => setConfirmId(r.id)} title="삭제">✕</button>
                    </div>
                    <div className="record-route">
                      <span>{r.from_location}</span>
                      <span className="record-route-arrow">→</span>
                      <span style={{ color: r.to_location ? 'inherit' : 'var(--gray-400)' }}>
                        {r.to_location || '미입력'}
                      </span>
                    </div>
                    <div className="record-meta">
                      {r.distance != null && <span className="record-km">📍 {r.distance}km</span>}
                      {r.start_time && <span>{r.start_time}{r.end_time ? ` ~ ${r.end_time}` : ''}</span>}
                      {r.start_km != null && <span>{fmtNum(r.start_km)}km{r.end_km != null ? ` → ${fmtNum(r.end_km)}km` : ''}</span>}
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
      {view === 'form' && <LogMain addToast={addToast} />}
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
