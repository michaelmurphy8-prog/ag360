'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  Truck, Sprout, Users, Briefcase, MapPin, Calendar,
  DollarSign, Plus, X, ChevronDown, RefreshCw,
  Wheat, CheckCircle, Clock, Tractor, ArrowRight
} from 'lucide-react'

interface Job {
  id: string
  clerk_user_id: string
  poster_type: string
  title: string
  provider_type_needed: string
  description: string
  location_city?: string
  location_province?: string
  start_date?: string
  end_date?: string
  rate?: string
  rate_type?: string
  status: string
  created_at: string
  application_count: number
}

const PROVIDER_TYPE_OPTIONS = [
  { value: 'any',          label: 'Any Provider',    icon: Users    },
  { value: 'trucker',      label: 'Custom Transport', icon: Truck    },
  { value: 'applicator',   label: 'Custom Work',      icon: Sprout   },
  { value: 'worker',       label: 'Farm Worker',      icon: Users    },
  { value: 'professional', label: 'Professional',     icon: Briefcase},
]

const FARMER_SUB_TYPES = [
  'Grain','Produce','Cattle','Specialty','Horticulture',
  'Aquaculture','Dairy','Viticulture','Citrus & Fruit',
]

const RATE_TYPES = [
  { value: 'hourly',     label: 'Per Hour'  },
  { value: 'daily',      label: 'Per Day'   },
  { value: 'flat',       label: 'Flat Rate' },
  { value: 'negotiable', label: 'Negotiable'},
]

const CANADIAN_PROVINCES = ['AB','BC','MB','NB','NL','NS','NT','NU','ON','PE','QC','SK','YT']

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  const hrs = Math.floor(diff / 3600000)
  if (hrs < 1) return 'Just now'
  if (hrs < 24) return `${hrs}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 12,
  border: '1px solid #EEE9E0', backgroundColor: '#FFFFFF',
  color: '#0D1520', fontSize: 14, outline: 'none',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#8A9BB0',
  marginBottom: 6, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.04em',
}

type FeedTab = 'farm' | 'general'

export default function JobsPage() {
  const router = useRouter()
  const { user } = useUser()
  const [feedTab, setFeedTab] = useState<FeedTab>('farm')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [showPost, setShowPost] = useState(false)
  const [showDetail, setShowDetail] = useState<Job | null>(null)
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [applyMessage, setApplyMessage] = useState('')
  const [filterType, setFilterType] = useState('any')
  const [filterProvince, setFilterProvince] = useState('')

  // Post form state
  const [posting, setPosting] = useState(false)
  const [postSuccess, setPostSuccess] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    provider_type_needed: 'any',
    location_city: '',
    location_province: '',
    start_date: '',
    end_date: '',
    rate: '',
    rate_type: 'negotiable',
    farmer_sub_type: '',
  })

  useEffect(() => {
    fetchJobs()
  }, [feedTab, filterType, filterProvince])

  async function fetchJobs() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ poster_type: feedTab })
      if (filterType !== 'any') params.set('provider_type', filterType)
      if (filterProvince) params.set('province', filterProvince)
      const res = await fetch(`/api/connect360/jobs?${params}`)
      const data = await res.json()
      setJobs(data.jobs ?? [])
    } catch {} finally {
      setLoading(false)
    }
  }

  function setField(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handlePost() {
    if (!form.title.trim() || !form.description.trim()) return
    setPosting(true)
    try {
      const res = await fetch('/api/connect360/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, poster_type: feedTab }),
      })
      if (res.ok) {
        setPostSuccess(true)
        setTimeout(() => {
          setShowPost(false)
          setPostSuccess(false)
          setForm({ title: '', description: '', provider_type_needed: 'any', location_city: '', location_province: '', start_date: '', end_date: '', rate: '', rate_type: 'negotiable', farmer_sub_type: '' })
          fetchJobs()
        }, 1500)
      }
    } catch {} finally {
      setPosting(false)
    }
  }

  async function handleApply() {
    if (!showDetail) return
    setApplying(true)
    try {
      const res = await fetch('/api/connect360/jobs/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: showDetail.id, message: applyMessage }),
      })
      if (res.ok) {
        setApplied(true)
        setJobs(js => js.map(j => j.id === showDetail.id ? { ...j, application_count: j.application_count + 1 } : j))
      }
    } catch {} finally {
      setApplying(false)
    }
  }

  // ── JOB DETAIL VIEW ──
  if (showDetail) {
    const isOwn = showDetail.clerk_user_id === user?.id
    const typeConfig = PROVIDER_TYPE_OPTIONS.find(t => t.value === showDetail.provider_type_needed) ?? PROVIDER_TYPE_OPTIONS[0]
    const Icon = typeConfig.icon

    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>
        {/* Header */}
        <div className="px-5 pt-14 pb-5" style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px' }}>
          <button onClick={() => { setShowDetail(null); setApplied(false); setApplyMessage('') }}
            className="flex items-center gap-1.5 mb-4 text-xs font-semibold"
            style={{ color: '#8A9BB0' }}>
            ← Back to Jobs
          </button>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(201,168,76,0.15)' }}>
              <Icon size={18} style={{ color: '#C9A84C' }} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold leading-tight" style={{ color: '#FFFFFF' }}>{showDetail.title}</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {showDetail.location_city && (
                  <span className="flex items-center gap-1 text-xs" style={{ color: '#8A9BB0' }}>
                    <MapPin size={10} /> {showDetail.location_city}{showDetail.location_province ? `, ${showDetail.location_province}` : ''}
                  </span>
                )}
                <span className="text-xs" style={{ color: '#8A9BB0' }}>{timeAgo(showDetail.created_at)}</span>
              </div>
            </div>
          </div>

          {/* Meta pills */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <span className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: 'rgba(201,168,76,0.15)', color: '#C9A84C' }}>
              {typeConfig.label}
            </span>
            {showDetail.rate && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#FFFFFF' }}>
                {showDetail.rate} · {RATE_TYPES.find(r => r.value === showDetail.rate_type)?.label ?? showDetail.rate_type}
              </span>
            )}
            {showDetail.start_date && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#FFFFFF' }}>
                {new Date(showDetail.start_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                {showDetail.end_date ? ` – ${new Date(showDetail.end_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' })}` : ''}
              </span>
            )}
            <span className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#8A9BB0' }}>
              {showDetail.application_count} applicant{showDetail.application_count !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#B0A898' }}>Description</div>
            <p className="text-sm leading-relaxed" style={{ color: '#0D1520' }}>{showDetail.description}</p>
          </div>

          {!isOwn && (
            applied ? (
              <div className="rounded-2xl p-4 flex items-center gap-3"
                style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                <CheckCircle size={20} style={{ color: '#22C55E' }} />
                <div>
                  <div className="font-bold text-sm" style={{ color: '#15803D' }}>Application sent</div>
                  <div className="text-xs mt-0.5" style={{ color: '#16A34A' }}>The poster will review your profile and get in touch.</div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#B0A898' }}>Apply for this job</div>
                <textarea
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                  placeholder="Introduce yourself — why are you a good fit? (optional)"
                  value={applyMessage}
                  onChange={e => setApplyMessage(e.target.value)}
                />
                <button onClick={handleApply} disabled={applying}
                  className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#C9A84C', color: '#FFFFFF' }}>
                  {applying ? <RefreshCw size={16} className="animate-spin" /> : <><ArrowRight size={16} /> Apply Now</>}
                </button>
              </div>
            )
          )}

          {isOwn && (
            <div className="rounded-2xl p-4" style={{ backgroundColor: '#FDF8EE', border: '1px solid rgba(201,168,76,0.2)' }}>
              <div className="text-xs font-bold mb-1" style={{ color: '#C9A84C' }}>Your posting</div>
              <div className="text-sm" style={{ color: '#8A9BB0' }}>{showDetail.application_count} applicant{showDetail.application_count !== 1 ? 's' : ''} so far</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── POST A JOB FORM ──
  if (showPost) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>
        <div className="px-5 pt-14 pb-5" style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px' }}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>Post a Job</h1>
              <p className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>
                {feedTab === 'farm' ? 'Farm job or service needed' : 'Advertise your services'}
              </p>
            </div>
            <button onClick={() => setShowPost(false)}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <X size={18} style={{ color: '#FFFFFF' }} />
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4 pb-32">
          {/* Farm sub-type — farm feed only */}
          {feedTab === 'farm' && (
            <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <label style={labelStyle}>Farm Type</label>
              <div className="flex flex-wrap gap-2">
                {FARMER_SUB_TYPES.map(s => (
                  <button key={s} type="button" onClick={() => setField('farmer_sub_type', s)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                    style={{
                      border: `1px solid ${form.farmer_sub_type === s ? '#C9A84C' : '#EEE9E0'}`,
                      backgroundColor: form.farmer_sub_type === s ? '#FDF8EE' : '#FFFFFF',
                      color: form.farmer_sub_type === s ? '#C9A84C' : '#8A9BB0',
                    }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Core fields */}
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div>
              <label style={labelStyle}>Job Title *</label>
              <input style={inputStyle} value={form.title} onChange={e => setField('title', e.target.value)}
                placeholder={feedTab === 'farm' ? 'e.g. Grain hauler needed for harvest' : 'e.g. Custom spraying available — SK'} />
            </div>
            <div>
              <label style={labelStyle}>Description *</label>
              <textarea rows={4} style={{ ...inputStyle, resize: 'none' }}
                value={form.description} onChange={e => setField('description', e.target.value)}
                placeholder={feedTab === 'farm'
                  ? 'Describe the work needed, operation size, equipment, expectations...'
                  : 'Describe your services, experience, what you offer...'} />
            </div>
          </div>

          {/* Provider type needed */}
          <div className="rounded-2xl p-4 space-y-2" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <label style={labelStyle}>Provider Type Needed</label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDER_TYPE_OPTIONS.map(opt => {
                const Icon = opt.icon
                return (
                  <button key={opt.value} type="button" onClick={() => setField('provider_type_needed', opt.value)}
                    className="flex items-center gap-2 p-3 rounded-xl text-left text-xs font-semibold transition-all"
                    style={{
                      border: `1px solid ${form.provider_type_needed === opt.value ? '#C9A84C' : '#EEE9E0'}`,
                      backgroundColor: form.provider_type_needed === opt.value ? '#FDF8EE' : '#FFFFFF',
                      color: form.provider_type_needed === opt.value ? '#C9A84C' : '#8A9BB0',
                    }}>
                    <Icon size={14} />
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Location */}
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <label style={labelStyle}>Location</label>
            <div className="grid grid-cols-2 gap-3">
              <input style={inputStyle} value={form.location_city} onChange={e => setField('location_city', e.target.value)} placeholder="City / Town" />
              <select style={inputStyle} value={form.location_province} onChange={e => setField('location_province', e.target.value)}>
                <option value="">Province</option>
                {CANADIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <label style={labelStyle}>Dates <span style={{ color: '#B0A898', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>Start</label>
                <input style={inputStyle} type="date" value={form.start_date} onChange={e => setField('start_date', e.target.value)} />
              </div>
              <div>
                <label style={{ ...labelStyle, fontSize: 10 }}>End</label>
                <input style={inputStyle} type="date" value={form.end_date} onChange={e => setField('end_date', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Rate */}
          <div className="rounded-2xl p-4 space-y-3" style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <label style={labelStyle}>Rate <span style={{ color: '#B0A898', textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></label>
            <div className="grid grid-cols-2 gap-3">
              <input style={inputStyle} value={form.rate} onChange={e => setField('rate', e.target.value)} placeholder="e.g. $25, $500, Competitive" />
              <select style={inputStyle} value={form.rate_type} onChange={e => setField('rate_type', e.target.value)}>
                {RATE_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="fixed bottom-0 left-0 right-0 px-5 pt-4"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 24px)', backgroundColor: '#F7F5F0', borderTop: '1px solid #EEE9E0' }}>
          {postSuccess ? (
            <div className="w-full py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-bold"
              style={{ backgroundColor: '#F0FDF4', color: '#15803D' }}>
              <CheckCircle size={16} /> Posted successfully!
            </div>
          ) : (
            <button onClick={handlePost} disabled={posting || !form.title.trim() || !form.description.trim()}
              className="w-full py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2"
              style={{
                backgroundColor: (form.title.trim() && form.description.trim()) ? '#0D1520' : '#E5E0D8',
                color: (form.title.trim() && form.description.trim()) ? '#FFFFFF' : '#B0A898',
              }}>
              {posting ? <RefreshCw size={16} className="animate-spin" /> : <><Plus size={16} /> Post Job</>}
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── JOBS FEED ──
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F7F5F0' }}>

      {/* Header */}
      <div className="px-5 pt-14 pb-5" style={{ background: 'linear-gradient(160deg, #0A1018 0%, #162030 100%)', borderRadius: '0 0 28px 28px', marginBottom: 12 }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#FFFFFF' }}>Jobs</h1>
            <p className="text-xs mt-0.5" style={{ color: '#8A9BB0' }}>
              {loading ? 'Loading...' : `${jobs.length} posting${jobs.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <button onClick={() => setShowPost(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold"
            style={{ backgroundColor: '#C9A84C', color: '#FFFFFF' }}>
            <Plus size={14} /> Post
          </button>
        </div>

        {/* Farm | General toggle */}
        <div className="flex rounded-2xl p-1" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
          {([
            { key: 'farm',    label: 'Farm',    icon: Tractor  },
            { key: 'general', label: 'General', icon: Briefcase },
          ] as const).map(tab => {
            const Icon = tab.icon
            const active = feedTab === tab.key
            return (
              <button key={tab.key} onClick={() => setFeedTab(tab.key)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  backgroundColor: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#0D1520' : '#8A9BB0',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                }}>
                <Icon size={14} />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 mb-3 flex gap-2">
        <select
          className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold outline-none"
          style={{ backgroundColor: '#FFFFFF', color: '#0D1520', border: '1px solid #EEE9E0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          value={filterType} onChange={e => setFilterType(e.target.value)}>
          {PROVIDER_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold outline-none"
          style={{ backgroundColor: '#FFFFFF', color: '#0D1520', border: '1px solid #EEE9E0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}
          value={filterProvince} onChange={e => setFilterProvince(e.target.value)}>
          <option value="">All Provinces</option>
          {CANADIAN_PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {/* Job cards */}
      <div className="px-5 space-y-3 pb-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ backgroundColor: '#FFFFFF' }} />
          ))
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ backgroundColor: '#FDF8EE' }}>
              <Wheat size={28} style={{ color: '#C9A84C' }} />
            </div>
            <h3 className="text-base font-bold mb-1" style={{ color: '#0D1520' }}>No jobs posted yet</h3>
            <p className="text-sm mb-5" style={{ color: '#8A9BB0' }}>
              {feedTab === 'farm' ? 'Be the first to post a farm job' : 'Be the first to advertise your services'}
            </p>
            <button onClick={() => setShowPost(true)}
              className="px-5 py-2.5 rounded-full text-xs font-bold"
              style={{ backgroundColor: '#0D1520', color: '#FFFFFF' }}>
              Post now
            </button>
          </div>
        ) : (
          jobs.map(job => {
            const typeConfig = PROVIDER_TYPE_OPTIONS.find(t => t.value === job.provider_type_needed) ?? PROVIDER_TYPE_OPTIONS[0]
            const Icon = typeConfig.icon
            const isOwn = job.clerk_user_id === user?.id

            return (
              <button key={job.id} onClick={() => setShowDetail(job)}
                className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-95"
                style={{ backgroundColor: '#FFFFFF', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                {/* Top bar */}
                <div className="px-4 pt-4 pb-2 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: '#FDF8EE' }}>
                    <Icon size={18} style={{ color: '#C9A84C' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm leading-tight" style={{ color: '#0D1520' }}>{job.title}</div>
                    <div className="text-xs mt-0.5 flex items-center gap-2 flex-wrap">
                      {(job.location_city || job.location_province) && (
                        <span className="flex items-center gap-0.5" style={{ color: '#8A9BB0' }}>
                          <MapPin size={9} />
                          {[job.location_city, job.location_province].filter(Boolean).join(', ')}
                        </span>
                      )}
                      <span style={{ color: '#B0A898' }}>{timeAgo(job.created_at)}</span>
                    </div>
                  </div>
                  {isOwn && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold flex-shrink-0"
                      style={{ backgroundColor: '#FDF8EE', color: '#C9A84C' }}>
                      Yours
                    </span>
                  )}
                </div>

                {/* Description preview */}
                <div className="px-4 pb-3">
                  <p className="text-xs leading-relaxed line-clamp-2" style={{ color: '#8A9BB0' }}>
                    {job.description}
                  </p>
                </div>

                {/* Footer strip */}
                <div className="flex items-center gap-2 px-4 pb-4 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold"
                    style={{ backgroundColor: '#FDF8EE', color: '#C9A84C' }}>
                    {typeConfig.label}
                  </span>
                  {job.rate && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold"
                      style={{ color: '#0D1520' }}>
                      <DollarSign size={9} />{job.rate}
                    </span>
                  )}
                  {job.start_date && (
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: '#8A9BB0' }}>
                      <Calendar size={9} />
                      {new Date(job.start_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', timeZone: 'UTC' })}
                    </span>
                  )}
                  <span className="ml-auto flex items-center gap-1 text-[10px]" style={{ color: '#B0A898' }}>
                    <Clock size={9} /> {job.application_count} applied
                  </span>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}