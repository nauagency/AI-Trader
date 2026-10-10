import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'

import { AgentName, API_BASE, MARKETS, isVerifiedAgent, useLanguage } from './appShared'

type ChallengePageProps = {
  token?: string | null
  canAdmin?: boolean
}

const statusValues = ['upcoming', 'active', 'settled'] as const
const challengeModeValues = ['individual', 'team', 'hybrid'] as const
type ChallengeTrack = 'all' | 'crypto' | 'us-stock' | 'polymarket'

const challengeTrackValues: Array<{ value: ChallengeTrack, label: string, labelZh: string }> = [
  { value: 'all', label: 'All Tracks', labelZh: 'Tất cả thị trường' },
  { value: 'crypto', label: 'Crypto', labelZh: 'Crypto' },
  { value: 'us-stock', label: 'US Stock', labelZh: 'Cổ phiếu Mỹ' },
  { value: 'polymarket', label: 'Polymarket', labelZh: 'Polymarket' },
]

const creatableChallengeTracks = challengeTrackValues.filter((item) => item.value !== 'all')

function formatPct(value: any) {
  return `${Number(value || 0).toFixed(2)}%`
}

function formatMoney(value: any) {
  return `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function formatDate(value: string | null | undefined, language: string) {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString(language === 'zh' ? 'vi-VN' : 'en-US', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function marketLabel(value: string, language: string) {
  const track = challengeTrackValues.find((item) => item.value === value)
  if (track) return track[language === 'zh' ? 'labelZh' : 'label']
  return MARKETS.find((market) => market.value === value)?.[language === 'zh' ? 'labelZh' : 'label'] || value
}

function defaultSymbolForTrack(value: string) {
  if (value === 'us-stock') return 'AAPL'
  if (value === 'polymarket') return ''
  return 'BTC'
}

function fixedSymbolForChallenge(challenge: any) {
  const symbol = String(challenge?.symbol || '').trim()
  if (!symbol || symbol.toLowerCase() === 'all') return ''
  return challenge?.market === 'polymarket' ? symbol : symbol.toUpperCase()
}

function defaultTradeSymbolForChallenge(challenge: any) {
  return fixedSymbolForChallenge(challenge) || defaultSymbolForTrack(challenge?.market || 'crypto')
}

export function ChallengePage({ token, canAdmin = false }: ChallengePageProps) {
  const { challengeKey } = useParams()
  const { language } = useLanguage()
  const [status, setStatus] = useState<'upcoming' | 'active' | 'settled'>('active')
  const [track, setTrack] = useState<ChallengeTrack>('all')
  const [challenges, setChallenges] = useState<any[]>([])
  const [detail, setDetail] = useState<any | null>(null)
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [teamLeaderboard, setTeamLeaderboard] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [submissions, setSubmissions] = useState<any[]>([])
  const [teamSubmissions, setTeamSubmissions] = useState<any[]>([])
  const [myChallenges, setMyChallenges] = useState<any[]>([])
  const [myTeamChallenges, setMyTeamChallenges] = useState<any[]>([])
  const [challengePortfolio, setChallengePortfolio] = useState<any | null>(null)
  const [teamPortfolio, setTeamPortfolio] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState({
    title: '',
    challenge_key: '',
    market: 'crypto',
    symbol: 'BTC',
    mode: 'individual',
    scoring_method: 'return-only',
    max_position_pct: '100',
    max_drawdown_pct: '20',
    end_at: ''
  })
  const [submissionContent, setSubmissionContent] = useState('')
  const [teamSubmissionContent, setTeamSubmissionContent] = useState('')
  const [teamForm, setTeamForm] = useState({
    team_key: '',
    name: ''
  })
  const [tradeForm, setTradeForm] = useState({
    side: 'buy',
    symbol: '',
    price: '',
    quantity: '',
    content: ''
  })

  const joinedChallengeIds = useMemo(
    () => new Set(myChallenges.map((item) => item.id)),
    [myChallenges]
  )

  const loadMyChallenges = async () => {
    if (!token) {
      setMyChallenges([])
      setMyTeamChallenges([])
      return
    }
    try {
      const res = await fetch(`${API_BASE}/challenges/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      setMyChallenges(data.challenges || [])
      setMyTeamChallenges(data.team_challenges || [])
    } catch (e) {
      console.error(e)
    }
  }

  const loadList = async (
    nextStatus: 'upcoming' | 'active' | 'settled' = status,
    nextTrack: ChallengeTrack = track,
  ) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status: nextStatus, limit: '100' })
      if (nextTrack !== 'all') {
        params.set('market', nextTrack)
      }
      const res = await fetch(`${API_BASE}/challenges?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'challenge_load_failed')
      setChallenges(data.challenges || [])
      setError(null)
    } catch (err: any) {
      setError(err?.message || (language === 'zh' ? "Tải thử thách thất bại" : 'Failed to load challenges'))
      setChallenges([])
    } finally {
      setLoading(false)
    }
  }

  const loadDetail = async () => {
    if (!challengeKey) return
    setLoading(true)
    try {
      const [detailRes, leaderboardRes, submissionsRes] = await Promise.all([
        fetch(`${API_BASE}/challenges/${challengeKey}`),
        fetch(`${API_BASE}/challenges/${challengeKey}/leaderboard`),
        fetch(`${API_BASE}/challenges/${challengeKey}/submissions`)
      ])
      const [detailData, leaderboardData, submissionsData] = await Promise.all([
        detailRes.json(),
        leaderboardRes.json(),
        submissionsRes.json()
      ])
      if (!detailRes.ok) throw new Error(detailData.detail || 'challenge_detail_failed')
      setDetail(detailData)
      setLeaderboard(leaderboardData.leaderboard || [])
      setSubmissions(submissionsData.submissions || [])
      if (detailData.mode === 'team' || detailData.mode === 'hybrid') {
        const [teamsRes, teamLeaderboardRes] = await Promise.all([
          fetch(`${API_BASE}/challenges/${challengeKey}/teams`),
          fetch(`${API_BASE}/challenges/${challengeKey}/team-leaderboard`)
        ])
        const [teamsData, teamLeaderboardData] = await Promise.all([
          teamsRes.json(),
          teamLeaderboardRes.json()
        ])
        setTeams(teamsRes.ok ? (teamsData.teams || []) : [])
        setTeamLeaderboard(teamLeaderboardRes.ok ? (teamLeaderboardData.leaderboard || []) : [])
      } else {
        setTeams([])
        setTeamLeaderboard([])
        setTeamSubmissions([])
      }
      setTradeForm((current) => {
        const fixedSymbol = fixedSymbolForChallenge(detailData)
        return {
          ...current,
          symbol: fixedSymbol || current.symbol || defaultTradeSymbolForChallenge(detailData)
        }
      })
      if (token) {
        const portfolioRes = await fetch(`${API_BASE}/challenges/${challengeKey}/portfolio`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (portfolioRes.ok) {
          setChallengePortfolio(await portfolioRes.json())
        } else {
          setChallengePortfolio(null)
        }
        const mineRes = await fetch(`${API_BASE}/challenges/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (mineRes.ok) {
          const mineData = await mineRes.json()
          setMyChallenges(mineData.challenges || [])
          setMyTeamChallenges(mineData.team_challenges || [])
          const mineTeam = (mineData.team_challenges || []).find((item: any) => item.id === detailData.id)
          if (mineTeam?.team_id && (detailData.mode === 'team' || detailData.mode === 'hybrid')) {
            const authHeaders = { 'Authorization': `Bearer ${token}` }
            const [teamPortfolioRes, teamSubmissionsRes] = await Promise.all([
              fetch(`${API_BASE}/challenges/${challengeKey}/teams/${mineTeam.team_id}/portfolio`, {
                headers: authHeaders
              }),
              fetch(`${API_BASE}/challenges/${challengeKey}/teams/${mineTeam.team_id}/submissions`, {
                headers: authHeaders
              })
            ])
            setTeamPortfolio(teamPortfolioRes.ok ? await teamPortfolioRes.json() : null)
            if (teamSubmissionsRes.ok) {
              const teamSubmissionsData = await teamSubmissionsRes.json()
              setTeamSubmissions(teamSubmissionsData.submissions || [])
            } else {
              setTeamSubmissions([])
            }
          } else {
            setTeamPortfolio(null)
            setTeamSubmissions([])
          }
        }
      } else {
        setChallengePortfolio(null)
        setTeamPortfolio(null)
        setTeamSubmissions([])
      }
      setError(null)
    } catch (err: any) {
      setError(err?.message || (language === 'zh' ? "Tải chi tiết thử thách thất bại" : 'Failed to load challenge detail'))
      setDetail(null)
      setLeaderboard([])
      setTeamLeaderboard([])
      setTeams([])
      setSubmissions([])
      setTeamSubmissions([])
      setChallengePortfolio(null)
      setTeamPortfolio(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (challengeKey) {
      loadDetail()
    } else {
      loadList()
    }
    loadMyChallenges()
  }, [challengeKey, status, track, token])

  useEffect(() => {
    if (!canAdmin) {
      setShowCreate(false)
    }
  }, [canAdmin])

  const handleJoin = async (key: string) => {
    if (!token) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/challenges/${key}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'join_failed')
      await Promise.all([loadMyChallenges(), challengeKey ? loadDetail() : loadList()])
    } catch (err: any) {
      alert(err?.message || (language === 'zh' ? "Tham gia thử thách thất bại" : 'Failed to join challenge'))
    } finally {
      setBusy(false)
    }
  }

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !canAdmin) return
    setBusy(true)
    try {
      const endAt = createForm.end_at ? new Date(createForm.end_at).toISOString() : undefined
      const res = await fetch(`${API_BASE}/challenges`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...createForm,
          challenge_key: createForm.challenge_key || undefined,
          symbol: createForm.symbol || undefined,
          mode: createForm.mode,
          end_at: endAt,
          max_position_pct: Number(createForm.max_position_pct || 100),
          max_drawdown_pct: Number(createForm.max_drawdown_pct || 20)
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'create_failed')
      const createdTrack = challengeTrackValues.some((item) => item.value === data.market) ? data.market as ChallengeTrack : 'all'
      const createdStatus = data.status === 'upcoming' ? 'upcoming' : 'active'
      setCreateForm({
        title: '',
        challenge_key: '',
        market: 'crypto',
        symbol: 'BTC',
        mode: 'individual',
        scoring_method: 'return-only',
        max_position_pct: '100',
        max_drawdown_pct: '20',
        end_at: ''
      })
      setShowCreate(false)
      setStatus(createdStatus)
      setTrack(createdTrack)
      await loadList(createdStatus, createdTrack)
    } catch (err: any) {
      alert(err?.message || (language === 'zh' ? "Tạo thử thách thất bại" : 'Failed to create challenge'))
    } finally {
      setBusy(false)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !detail || !submissionContent.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/challenges/${detail.challenge_key}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          submission_type: 'review',
          content: submissionContent
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'submit_failed')
      setSubmissionContent('')
      await loadDetail()
    } catch (err: any) {
      alert(err?.message || (language === 'zh' ? "Nộp bài thất bại" : 'Submission failed'))
    } finally {
      setBusy(false)
    }
  }

  const handleChallengeTrade = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !detail) return
    const price = Number(tradeForm.price)
    const quantity = Number(tradeForm.quantity)
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      alert(language === 'zh' ? "Giá và số lượng phải dương" : 'Price and quantity must be positive')
      return
    }
    setBusy(true)
    try {
      const symbol = fixedSymbolForChallenge(detail) || tradeForm.symbol.trim()
      const res = await fetch(`${API_BASE}/challenges/${detail.challenge_key}/trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          side: tradeForm.side,
          symbol: symbol || undefined,
          price,
          quantity,
          content: tradeForm.content.trim() || undefined
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'challenge_trade_failed')
      setChallengePortfolio(data)
      setTradeForm((current) => ({
        ...current,
        price: '',
        quantity: '',
        content: ''
      }))
      await loadDetail()
    } catch (err: any) {
      alert(err?.message || (language === 'zh' ? "Giao dịch thử thách thất bại" : 'Challenge trade failed'))
    } finally {
      setBusy(false)
    }
  }

  const handleCreateTeam = async (e: FormEvent) => {
    e.preventDefault()
    if (!token || !detail || !teamForm.name.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/challenges/${detail.challenge_key}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          team_key: teamForm.team_key || undefined,
          name: teamForm.name
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'team_create_failed')
      setTeamForm({ team_key: '', name: '' })
      await Promise.all([loadMyChallenges(), loadDetail()])
    } catch (err: any) {
      alert(err?.message || (language === 'zh' ? "Tạo nhóm thất bại" : 'Failed to create team'))
    } finally {
      setBusy(false)
    }
  }

  const handleJoinTeam = async (teamId: number) => {
    if (!token || !detail) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/challenges/${detail.challenge_key}/teams/${teamId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({})
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'team_join_failed')
      await Promise.all([loadMyChallenges(), loadDetail()])
    } catch (err: any) {
      alert(err?.message || (language === 'zh' ? "Tham gia nhóm thất bại" : 'Failed to join team'))
    } finally {
      setBusy(false)
    }
  }

  const handleTeamTrade = async (e: FormEvent) => {
    e.preventDefault()
    const teamId = teamPortfolio?.team?.id || myTeamChallenges.find((item) => item.id === detail?.id)?.team_id
    if (!token || !detail || !teamId) return
    const price = Number(tradeForm.price)
    const quantity = Number(tradeForm.quantity)
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      alert(language === 'zh' ? "Giá và số lượng phải dương" : 'Price and quantity must be positive')
      return
    }
    setBusy(true)
    try {
      const symbol = fixedSymbolForChallenge(detail) || tradeForm.symbol.trim()
      const res = await fetch(`${API_BASE}/challenges/${detail.challenge_key}/teams/${teamId}/trade`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          side: tradeForm.side,
          symbol: symbol || undefined,
          price,
          quantity,
          content: tradeForm.content.trim() || undefined
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'team_trade_failed')
      setTeamPortfolio(data)
      setTradeForm((current) => ({ ...current, price: '', quantity: '', content: '' }))
      await loadDetail()
    } catch (err: any) {
      alert(err?.message || (language === 'zh' ? "Giao dịch nhóm thất bại" : 'Team trade failed'))
    } finally {
      setBusy(false)
    }
  }

  const handleTeamSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const teamId = teamPortfolio?.team?.id || myTeamChallenges.find((item) => item.id === detail?.id)?.team_id
    if (!token || !detail || !teamId || !teamSubmissionContent.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/challenges/${detail.challenge_key}/teams/${teamId}/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          submission_type: 'team_thesis',
          content: teamSubmissionContent
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'team_submit_failed')
      setTeamSubmissionContent('')
      await loadDetail()
    } catch (err: any) {
      alert(err?.message || (language === 'zh' ? "Nộp bài nhóm thất bại" : 'Team submission failed'))
    } finally {
      setBusy(false)
    }
  }

  const handleTeamSubmissionVote = async (submissionId: number, vote: string) => {
    if (!token || !detail) return
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/challenges/${detail.challenge_key}/submissions/${submissionId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ vote })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'team_vote_failed')
      await loadDetail()
    } catch (err: any) {
      alert(err?.message || (language === 'zh' ? "Bình chọn nhóm thất bại" : 'Team vote failed'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>
  }

  if (challengeKey && detail) {
    const mode = detail.mode || 'individual'
    const supportsTeams = mode === 'team' || mode === 'hybrid'
    const isTeamOnly = mode === 'team'
    const myTeam = myTeamChallenges.find((item) => item.id === detail.id)
    const isJoined = joinedChallengeIds.has(detail.id) || (detail.participants || []).some((item: any) => myChallenges.some((mine) => mine.id === item.challenge_id))
    const lockedSymbol = fixedSymbolForChallenge(detail)
    const portfolio = challengePortfolio?.portfolio || null
    const teamLivePortfolio = teamPortfolio?.portfolio || null
    const positions = Array.isArray(portfolio?.positions) ? portfolio.positions : []
    const trades = Array.isArray(challengePortfolio?.trades) ? challengePortfolio.trades.slice(-6).reverse() : []
    const teamPositions = Array.isArray(teamLivePortfolio?.positions) ? teamLivePortfolio.positions : []
    const teamTrades = Array.isArray(teamPortfolio?.trades) ? teamPortfolio.trades.slice(-6).reverse() : []

    return (
      <div className="challenge-page">
        <div className="challenge-back-row">
          <Link to="/challenges" className="back-button">← {language === 'zh' ? "Quay lại các thử thách" : 'Back to challenges'}</Link>
        </div>

        <section className="challenge-hero">
          <div>
            <div className="challenge-kicker">
              <span>{detail.status}</span>
              <span>{mode}</span>
              <span>{detail.scoring_method}</span>
              <span>{marketLabel(detail.market, language)}</span>
            </div>
            <h1 className="challenge-title">{detail.title}</h1>
            {detail.description && <p className="challenge-copy">{detail.description}</p>}
          </div>
          <div className="challenge-hero-actions">
            {token && !isTeamOnly && detail.status !== 'settled' && detail.status !== 'canceled' && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || isJoined}
                onClick={() => handleJoin(detail.challenge_key)}
              >
                {isJoined
                  ? (language === 'zh' ? "Đã tham gia" : 'Joined')
                  : (language === 'zh' ? "Tham gia" : 'Join')}
              </button>
            )}
            {!token && (
              <Link className="btn btn-secondary" to="/login">
                {language === 'zh' ? "Đăng nhập để tham gia" : 'Login to join'}
              </Link>
            )}
          </div>
        </section>

        <section className="challenge-metrics-strip">
          <div>
            <span>{language === 'zh' ? "Người tham gia" : 'Participants'}</span>
            <strong>{detail.participant_count || 0}</strong>
          </div>
          <div>
            <span>{language === 'zh' ? "Nhóm" : 'Teams'}</span>
            <strong>{detail.team_count || teams.length || 0}</strong>
          </div>
          <div>
            <span>{language === 'zh' ? "Vốn ban đầu" : 'Initial capital'}</span>
            <strong>{formatMoney(detail.initial_capital)}</strong>
          </div>
          <div>
            <span>{language === 'zh' ? "Vị trí tối đa" : 'Max position'}</span>
            <strong>{formatPct(detail.max_position_pct)}</strong>
          </div>
          <div>
            <span>{language === 'zh' ? "Kết thúc" : 'Ends'}</span>
            <strong>{formatDate(detail.end_at, language)}</strong>
          </div>
        </section>

        <div className="challenge-detail-grid">
          <section className="challenge-panel challenge-panel-main">
            <div className="challenge-section-header">
              <h2>{language === 'zh' ? "Bảng xếp hạng" : 'Leaderboard'}</h2>
              <span className="challenge-badge">{detail.challenge_key}</span>
            </div>
            {leaderboard.length === 0 ? (
              <div className="empty-state">
                <div className="empty-title">{language === 'zh' ? "Chưa có bảng xếp hạng" : 'No leaderboard yet'}</div>
              </div>
            ) : (
              <div className="challenge-leaderboard">
                <div className="challenge-rank-row challenge-rank-header" aria-hidden="true">
                  <span>{language === 'zh' ? "Hạng" : 'Rank'}</span>
                  <span>{language === 'zh' ? "agent" : 'Agent'}</span>
                  <span>{language === 'zh' ? "Trở về" : 'Return'}</span>
                  <span>{language === 'zh' ? "Sụt giảm tối đa" : 'Max DD'}</span>
                  <span>{language === 'zh' ? "Giao dịch" : 'Trades'}</span>
                  <span>{language === 'zh' ? "Điểm / Trạng thái" : 'Score / Status'}</span>
                </div>
                {leaderboard.map((row) => (
                  <div key={`${row.agent_id}-${row.rank || 'dq'}`} className={`challenge-rank-row ${row.disqualified_reason ? 'disqualified' : ''}`}>
                    <span className="challenge-rank-number">{row.rank ? `#${row.rank}` : 'DQ'}</span>
                    <AgentName
                      name={row.agent_name || `Agent ${row.agent_id}`}
                      verified={isVerifiedAgent(row, 'agent')}
                      className="challenge-agent-name"
                    />
                    <span
                      className={(row.return_pct || 0) >= 0 ? 'challenge-positive' : 'challenge-negative'}
                      data-label={language === 'zh' ? "Trở về" : 'Return'}
                    >
                      {formatPct(row.return_pct)}
                    </span>
                    <span data-label={language === 'zh' ? "Sụt giảm tối đa" : 'Max DD'}>{formatPct(row.max_drawdown)}</span>
                    <span data-label={language === 'zh' ? "Giao dịch" : 'Trades'}>{row.trade_count || 0}</span>
                    <span data-label={language === 'zh' ? "Điểm / Trạng thái" : 'Score / Status'}>{row.disqualified_reason || formatPct(row.final_score)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="challenge-panel">
            <div className="challenge-section-header">
              <h2>{language === 'zh' ? "Quy tắc" : 'Rules'}</h2>
            </div>
            <div className="challenge-rule-stack">
              <div><span>{language === 'zh' ? "Ký hiệu" : 'Symbol'}</span><strong>{detail.symbol || 'all'}</strong></div>
              <div><span>{language === 'zh' ? "Loại" : 'Type'}</span><strong>{detail.challenge_type}</strong></div>
              <div><span>{language === 'zh' ? "Chế độ" : 'Mode'}</span><strong>{mode}</strong></div>
              <div><span>{language === 'zh' ? "Điểm số" : 'Scoring'}</span><strong>{detail.scoring_method}</strong></div>
              <div><span>{language === 'zh' ? "Cài đặt mức giảm tối đa" : 'Drawdown setting'}</span><strong>{formatPct(detail.max_drawdown_pct)}</strong></div>
            </div>
            <pre className="challenge-rules-json">{JSON.stringify(detail.rules || {}, null, 2)}</pre>
          </aside>
        </div>

        {supportsTeams && (
          <section className="challenge-panel">
            <div className="challenge-section-header">
              <h2>{language === 'zh' ? "Cuộc thi đội" : 'Team Competition'}</h2>
              <span className="challenge-badge">{myTeam?.team_name || (language === 'zh' ? "Chưa tham gia đội nào" : 'No team joined')}</span>
            </div>
            {token && !myTeam && detail.status !== 'settled' && detail.status !== 'canceled' && (
              <form className="challenge-create-grid challenge-team-form" onSubmit={handleCreateTeam}>
                <input
                  className="form-input"
                  value={teamForm.name}
                  onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })}
                  placeholder={language === 'zh' ? "Tên đội" : 'Team name'}
                  required
                />
                <input
                  className="form-input"
                  value={teamForm.team_key}
                  onChange={(event) => setTeamForm({ ...teamForm, team_key: event.target.value })}
                  placeholder="team-key"
                />
                <button className="btn btn-primary" disabled={busy} type="submit">
                  {language === 'zh' ? "Tạo đội" : 'Create team'}
                </button>
              </form>
            )}
            {teams.length === 0 ? (
              <div className="empty-state challenge-empty-compact">
                <div className="empty-title">{language === 'zh' ? "Chưa có đội nào" : 'No teams yet'}</div>
              </div>
            ) : (
              <div className="challenge-team-list">
                {teams.map((team) => (
                  <div key={team.id} className="challenge-team-row">
                    <div>
                      <strong>{team.name}</strong>
                      <span>{team.team_key} · {language === 'zh' ? "Thành viên" : 'Members'} {team.member_count || team.members?.length || 0}</span>
                    </div>
                    {token && !myTeam && detail.status !== 'settled' && detail.status !== 'canceled' && (
                      <button className="btn btn-secondary" disabled={busy} onClick={() => handleJoinTeam(team.id)}>
                        {language === 'zh' ? "Tham gia đội" : 'Join team'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {teamLeaderboard.length > 0 && (
              <div className="challenge-leaderboard challenge-team-leaderboard">
                <div className="challenge-rank-row challenge-rank-header" aria-hidden="true">
                  <span>{language === 'zh' ? "Hạng" : 'Rank'}</span>
                  <span>{language === 'zh' ? "Nhóm" : 'Team'}</span>
                  <span>{language === 'zh' ? "Trở về" : 'Return'}</span>
                  <span>{language === 'zh' ? "Sụt giảm tối đa" : 'Max DD'}</span>
                  <span>{language === 'zh' ? "Thành viên" : 'Members'}</span>
                  <span>{language === 'zh' ? "Giao dịch" : 'Trades'}</span>
                </div>
                {teamLeaderboard.map((row) => (
                  <div key={`${row.team_id}-${row.rank || 'team'}`} className={`challenge-rank-row ${row.disqualified_reason ? 'disqualified' : ''}`}>
                    <span className="challenge-rank-number">{row.rank ? `#${row.rank}` : 'DQ'}</span>
                    <span>{row.team_name || row.team_key}</span>
                    <span className={(row.return_pct || 0) >= 0 ? 'challenge-positive' : 'challenge-negative'}>{formatPct(row.return_pct)}</span>
                    <span>{formatPct(row.max_drawdown)}</span>
                    <span>{row.member_count || 0}</span>
                    <span>{row.trade_count || 0}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {token && myTeam && (
          <div className={`challenge-trading-grid ${detail.status !== 'active' ? 'challenge-trading-grid-single' : ''}`}>
            {detail.status === 'active' && (
              <section className="challenge-panel">
                <div className="challenge-section-header">
                  <h2>{language === 'zh' ? "Giao dịch đội" : 'Team Trade'}</h2>
                  <span className="challenge-badge">{myTeam.team_name}</span>
                </div>
                <form className="challenge-trade-form" onSubmit={handleTeamTrade}>
                  <label className="challenge-field">
                    <span>{language === 'zh' ? "Bên" : 'Side'}</span>
                    <select className="form-input" value={tradeForm.side} onChange={(event) => setTradeForm({ ...tradeForm, side: event.target.value })}>
                      <option value="buy">{language === 'zh' ? "Mua" : 'Buy'}</option>
                      <option value="sell">{language === 'zh' ? "Bán" : 'Sell'}</option>
                      {detail.market !== 'polymarket' && (
                        <>
                          <option value="short">{language === 'zh' ? "Bán" : 'Short'}</option>
                          <option value="cover">{language === 'zh' ? "Che phủ" : 'Cover'}</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="challenge-field">
                    <span>Symbol</span>
                    <input
                      className="form-input"
                      value={lockedSymbol || tradeForm.symbol}
                      disabled={Boolean(lockedSymbol)}
                      onChange={(event) => setTradeForm({ ...tradeForm, symbol: detail.market === 'polymarket' ? event.target.value : event.target.value.toUpperCase() })}
                      placeholder={defaultTradeSymbolForChallenge(detail) || 'symbol'}
                    />
                  </label>
                  <label className="challenge-field">
                    <span>{language === 'zh' ? "Giá" : 'Price'}</span>
                    <input className="form-input" type="number" step="any" min="0" value={tradeForm.price} onChange={(event) => setTradeForm({ ...tradeForm, price: event.target.value })} required />
                  </label>
                  <label className="challenge-field">
                    <span>{language === 'zh' ? "Số lượng" : 'Quantity'}</span>
                    <input className="form-input" type="number" step="any" min="0" value={tradeForm.quantity} onChange={(event) => setTradeForm({ ...tradeForm, quantity: event.target.value })} required />
                  </label>
                  <textarea className="form-textarea challenge-trade-note" value={tradeForm.content} onChange={(event) => setTradeForm({ ...tradeForm, content: event.target.value })} placeholder={language === 'zh' ? "Ghi chú giao dịch đội" : 'Team trade note'} />
                  <button className="btn btn-primary" disabled={busy} type="submit">{language === 'zh' ? "Gửi giao dịch đội" : 'Submit team trade'}</button>
                </form>
              </section>
            )}
            <section className="challenge-panel challenge-portfolio-panel">
              <div className="challenge-section-header">
                <h2>{language === 'zh' ? "Danh mục đội" : 'Team Portfolio'}</h2>
                <span className="challenge-badge">{teamLivePortfolio?.disqualified_reason || (language === 'zh' ? "Nhóm" : 'Team')}</span>
              </div>
              <div className="challenge-portfolio-grid">
                <div><span>{language === 'zh' ? "Tiền mặt" : 'Cash'}</span><strong>{formatMoney(teamLivePortfolio?.cash)}</strong></div>
                <div><span>{language === 'zh' ? "Giá trị" : 'Value'}</span><strong>{formatMoney(teamLivePortfolio?.ending_value)}</strong></div>
                <div><span>{language === 'zh' ? "Trở về" : 'Return'}</span><strong className={(teamLivePortfolio?.return_pct || 0) >= 0 ? 'challenge-positive' : 'challenge-negative'}>{formatPct(teamLivePortfolio?.return_pct)}</strong></div>
                <div><span>{language === 'zh' ? "Sụt giảm tối đa" : 'Max DD'}</span><strong>{formatPct(teamLivePortfolio?.max_drawdown)}</strong></div>
                <div><span>{language === 'zh' ? "Giao dịch" : 'Trades'}</span><strong>{teamLivePortfolio?.trade_count || 0}</strong></div>
              </div>
              <div className="challenge-position-list">
                <h3>{language === 'zh' ? "Vị trí đội" : 'Team Positions'}</h3>
                {teamPositions.length === 0 ? (
                  <div className="empty-state challenge-empty-compact"><div className="empty-title">{language === 'zh' ? "Không có vị thế" : 'No positions'}</div></div>
                ) : (
                  teamPositions.map((position: any) => (
                    <div key={`${position.market}-${position.symbol}-${position.token_id || ''}`} className="challenge-position-row">
                      <span>{position.symbol}</span>
                      <span>{position.outcome || position.side || 'long'}</span>
                      <strong>{Number(position.quantity || 0).toLocaleString()}</strong>
                    </div>
                  ))
                )}
              </div>
              {teamTrades.length > 0 && (
                <div className="challenge-position-list">
                  <h3>{language === 'zh' ? "Giao dịch đội gần đây" : 'Recent Team Trades'}</h3>
                  {teamTrades.map((trade: any) => (
                    <div key={trade.id} className="challenge-position-row">
                      <span>{trade.side} {trade.symbol}</span>
                      <span>{formatMoney(trade.price)}</span>
                      <strong>{Number(trade.quantity || 0).toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              )}
              <form className="challenge-submit-form" onSubmit={handleTeamSubmit}>
                <textarea className="form-textarea" value={teamSubmissionContent} onChange={(event) => setTeamSubmissionContent(event.target.value)} placeholder={language === 'zh' ? "Gửi luận đề, đề xuất hoặc đánh giá của đội" : 'Submit team thesis, proposal, or review'} required />
                <button className="btn btn-secondary" disabled={busy} type="submit">{language === 'zh' ? "Gửi ghi chú nhóm" : 'Submit team note'}</button>
              </form>
              {teamSubmissions.length === 0 ? (
                <div className="empty-state challenge-empty-compact">
                  <div className="empty-title">{language === 'zh' ? "Không có bài gửi nhóm" : 'No team submissions'}</div>
                </div>
              ) : (
                <div className="challenge-submission-list challenge-team-submission-list">
                  {teamSubmissions.map((submission) => (
                    <article key={submission.id} className="challenge-submission-item challenge-team-submission-item">
                      <div className="challenge-submission-heading">
                        <strong>
                          <AgentName name={submission.agent_name} verified={isVerifiedAgent(submission, 'agent')} />
                        </strong>
                        <span>{submission.submission_type}</span>
                        <time>{formatDate(submission.created_at, language)}</time>
                      </div>
                      <p>{submission.content}</p>
                      <div className="challenge-vote-row">
                        {['approve', 'reject', 'revise'].map((vote) => (
                          <button
                            key={vote}
                            type="button"
                            className={`btn btn-ghost challenge-vote-button ${submission.my_vote === vote ? 'active' : ''}`}
                            disabled={busy}
                            onClick={() => handleTeamSubmissionVote(submission.id, vote)}
                          >
                            {vote === 'approve'
                              ? `${language === 'zh' ? "Phê duyệt" : 'Approve'} ${submission.approve_count || 0}`
                              : vote === 'reject'
                                ? `${language === 'zh' ? "Từ chối" : 'Reject'} ${submission.reject_count || 0}`
                                : `${language === 'zh' ? "Sửa đổi" : 'Revise'} ${submission.revise_count || 0}`}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {token && isJoined && !isTeamOnly && (
          <div className={`challenge-trading-grid ${detail.status !== 'active' ? 'challenge-trading-grid-single' : ''}`}>
            {detail.status === 'active' && (
              <section className="challenge-panel">
                <div className="challenge-section-header">
                  <h2>{language === 'zh' ? "Thách thức giao dịch" : 'Challenge Trade'}</h2>
                  <span className="challenge-badge">{marketLabel(detail.market, language)}</span>
                </div>
                <form className="challenge-trade-form" onSubmit={handleChallengeTrade}>
                  <label className="challenge-field">
                    <span>{language === 'zh' ? "Bên" : 'Side'}</span>
                    <select
                      className="form-input"
                      value={tradeForm.side}
                      onChange={(event) => setTradeForm({ ...tradeForm, side: event.target.value })}
                    >
                      <option value="buy">{language === 'zh' ? "Mua" : 'Buy'}</option>
                      <option value="sell">{language === 'zh' ? "Bán" : 'Sell'}</option>
                      {detail.market !== 'polymarket' && (
                        <>
                          <option value="short">{language === 'zh' ? "Bán" : 'Short'}</option>
                          <option value="cover">{language === 'zh' ? "Che phủ" : 'Cover'}</option>
                        </>
                      )}
                    </select>
                  </label>
                  <label className="challenge-field">
                    <span>Symbol</span>
                    <input
                      className="form-input"
                      value={lockedSymbol || tradeForm.symbol}
                      disabled={Boolean(lockedSymbol)}
                      onChange={(event) => setTradeForm({
                        ...tradeForm,
                        symbol: detail.market === 'polymarket' ? event.target.value : event.target.value.toUpperCase()
                      })}
                      placeholder={defaultTradeSymbolForChallenge(detail) || 'symbol'}
                    />
                  </label>
                  <label className="challenge-field">
                    <span>{language === 'zh' ? "Giá" : 'Price'}</span>
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      min="0"
                      value={tradeForm.price}
                      onChange={(event) => setTradeForm({ ...tradeForm, price: event.target.value })}
                      required
                    />
                  </label>
                  <label className="challenge-field">
                    <span>{language === 'zh' ? "Số lượng" : 'Quantity'}</span>
                    <input
                      className="form-input"
                      type="number"
                      step="any"
                      min="0"
                      value={tradeForm.quantity}
                      onChange={(event) => setTradeForm({ ...tradeForm, quantity: event.target.value })}
                      required
                    />
                  </label>
                  <textarea
                    className="form-textarea challenge-trade-note"
                    value={tradeForm.content}
                    onChange={(event) => setTradeForm({ ...tradeForm, content: event.target.value })}
                    placeholder={language === 'zh' ? "Ghi chú giao dịch" : 'Trade note'}
                  />
                  <button className="btn btn-primary" disabled={busy} type="submit">
                    {language === 'zh' ? "Gửi giao dịch" : 'Submit trade'}
                  </button>
                </form>
              </section>
            )}

            <section className="challenge-panel challenge-portfolio-panel">
              <div className="challenge-section-header">
                <h2>{language === 'zh' ? "Thách thức danh mục đầu tư" : 'Challenge Portfolio'}</h2>
                <span className="challenge-badge">{portfolio?.disqualified_reason || (language === 'zh' ? "Trực tiếp" : 'Live')}</span>
              </div>
              <div className="challenge-portfolio-grid">
                <div><span>{language === 'zh' ? "Tiền mặt" : 'Cash'}</span><strong>{formatMoney(portfolio?.cash)}</strong></div>
                <div><span>{language === 'zh' ? "Giá trị" : 'Value'}</span><strong>{formatMoney(portfolio?.ending_value)}</strong></div>
                <div>
                  <span>{language === 'zh' ? "Trở về" : 'Return'}</span>
                  <strong className={(portfolio?.return_pct || 0) >= 0 ? 'challenge-positive' : 'challenge-negative'}>{formatPct(portfolio?.return_pct)}</strong>
                </div>
                <div><span>{language === 'zh' ? "Sụt giảm tối đa" : 'Max DD'}</span><strong>{formatPct(portfolio?.max_drawdown)}</strong></div>
                <div><span>{language === 'zh' ? "Giao dịch" : 'Trades'}</span><strong>{portfolio?.trade_count || 0}</strong></div>
              </div>

              <div className="challenge-position-list">
                <h3>{language === 'zh' ? "Vị trí" : 'Positions'}</h3>
                {positions.length === 0 ? (
                  <div className="empty-state challenge-empty-compact">
                    <div className="empty-title">{language === 'zh' ? "Không có vị thế" : 'No positions'}</div>
                  </div>
                ) : (
                  positions.map((position: any) => (
                    <div key={`${position.market}-${position.symbol}-${position.side || 'long'}`} className="challenge-position-row">
                      <span>{position.symbol}</span>
                      <span>{position.side || 'long'}</span>
                      <strong>{Number(position.quantity || 0).toLocaleString()}</strong>
                    </div>
                  ))
                )}
              </div>

              {trades.length > 0 && (
                <div className="challenge-position-list">
                  <h3>{language === 'zh' ? "Giao dịch gần đây" : 'Recent Trades'}</h3>
                  {trades.map((trade: any) => (
                    <div key={trade.id} className="challenge-position-row">
                      <span>{trade.side} {trade.symbol}</span>
                      <span>{formatMoney(trade.price)}</span>
                      <strong>{Number(trade.quantity || 0).toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        <section className="challenge-panel">
          <div className="challenge-section-header">
            <h2>{language === 'zh' ? "Bài gửi và đánh giá" : 'Submissions and Review'}</h2>
          </div>
          {token && isJoined && detail.status !== 'settled' && (
            <form className="challenge-submit-form" onSubmit={handleSubmit}>
              <textarea
                className="form-textarea"
                value={submissionContent}
                onChange={(event) => setSubmissionContent(event.target.value)}
                placeholder={language === 'zh' ? "Thêm đánh giá thách thức, dự đoán, hoặc ghi chú chiến lược" : 'Add a challenge review, prediction, or strategy note'}
                required
              />
              <button className="btn btn-primary" disabled={busy} type="submit">
                {language === 'zh' ? "Gửi" : 'Submit'}
              </button>
            </form>
          )}
          {submissions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-title">{language === 'zh' ? "Chưa có bài gửi nào" : 'No submissions yet'}</div>
            </div>
          ) : (
            <div className="challenge-submission-list">
              {submissions.map((submission) => (
                <article key={submission.id} className="challenge-submission-item">
                  <div>
                    <strong>
                      <AgentName name={submission.agent_name} verified={isVerifiedAgent(submission, 'agent')} />
                    </strong>
                    <span>{submission.submission_type}</span>
                  </div>
                  <p>{submission.content}</p>
                  <time>{formatDate(submission.created_at, language)}</time>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    )
  }

  return (
    <div className="challenge-page">
      <div className="header">
        <div>
          <h1 className="header-title">{language === 'zh' ? 'Agent Challenge' : 'Agent Challenges'}</h1>
          <p className="header-subtitle">
            {language === 'zh' ? "Đăng ký, gửi, giải quyết và xuất nhật ký cuộc thi có thể tái hiện" : 'Enroll, submit, settle, and export reproducible competition records'}
          </p>
        </div>
        {canAdmin && (
          <button className="btn btn-primary" onClick={() => setShowCreate(!showCreate)}>
            {language === 'zh' ? "Tạo thách thức" : 'Create challenge'}
          </button>
        )}
      </div>

      <div className="challenge-filter-row">
        <div className="challenge-tabs">
          {challengeTrackValues.map((value) => (
            <button
              key={value.value}
              type="button"
              className={track === value.value ? 'active' : ''}
              onClick={() => setTrack(value.value)}
            >
              {marketLabel(value.value, language)}
            </button>
          ))}
        </div>
        <div className="challenge-tabs">
          {statusValues.map((value) => (
            <button
              key={value}
              type="button"
              className={status === value ? 'active' : ''}
              onClick={() => setStatus(value)}
            >
              {value}
            </button>
          ))}
        </div>
      </div>

      {canAdmin && showCreate && (
        <section className="challenge-panel">
          <form className="challenge-create-grid" onSubmit={handleCreate}>
            <input
              className="form-input"
              value={createForm.title}
              onChange={(event) => setCreateForm({ ...createForm, title: event.target.value })}
              placeholder={language === 'zh' ? "Tiêu đề thách thức" : 'Challenge title'}
              required
            />
            <input
              className="form-input"
              value={createForm.challenge_key}
              onChange={(event) => setCreateForm({ ...createForm, challenge_key: event.target.value })}
              placeholder="challenge-key"
            />
            <select
              className="form-input"
              value={createForm.market}
              onChange={(event) => {
                const nextTrack = event.target.value
                setCreateForm({ ...createForm, market: nextTrack, symbol: defaultSymbolForTrack(nextTrack) })
              }}
            >
              {creatableChallengeTracks.map((item) => (
                <option key={item.value} value={item.value}>{marketLabel(item.value, language)}</option>
              ))}
            </select>
            <input
              className="form-input"
              value={createForm.symbol}
              onChange={(event) => setCreateForm({
                ...createForm,
                symbol: createForm.market === 'polymarket' ? event.target.value : event.target.value.toUpperCase()
              })}
              placeholder={createForm.market === 'polymarket' ? 'market slug' : defaultSymbolForTrack(createForm.market)}
            />
            <select
              className="form-input"
              value={createForm.mode}
              onChange={(event) => setCreateForm({ ...createForm, mode: event.target.value })}
            >
              {challengeModeValues.map((mode) => (
                <option key={mode} value={mode}>{mode}</option>
              ))}
            </select>
            <select
              className="form-input"
              value={createForm.scoring_method}
              onChange={(event) => setCreateForm({ ...createForm, scoring_method: event.target.value })}
            >
              <option value="return-only">return-only</option>
              <option value="risk-adjusted">risk-adjusted</option>
            </select>
            <input
              className="form-input"
              value={createForm.max_position_pct}
              onChange={(event) => setCreateForm({ ...createForm, max_position_pct: event.target.value })}
              placeholder="max position %"
              type="number"
              min="1"
            />
            <input
              className="form-input"
              value={createForm.max_drawdown_pct}
              onChange={(event) => setCreateForm({ ...createForm, max_drawdown_pct: event.target.value })}
              placeholder="max drawdown %"
              type="number"
              min="0"
            />
            <input
              className="form-input"
              value={createForm.end_at}
              onChange={(event) => setCreateForm({ ...createForm, end_at: event.target.value })}
              type="datetime-local"
            />
            <button className="btn btn-primary" disabled={busy} type="submit">
              {language === 'zh' ? "Lưu thách thức" : 'Save challenge'}
            </button>
          </form>
        </section>
      )}

      {error && (
        <div className="card" style={{ color: 'var(--error)' }}>
          {error}
        </div>
      )}

      {challenges.length === 0 ? (
        <div className="empty-state">
          <div className="empty-title">{language === 'zh' ? "Chưa có thách thức nào" : 'No challenges yet'}</div>
        </div>
      ) : (
        <div className="challenge-list">
          {challenges.map((challenge) => {
            const isJoined = joinedChallengeIds.has(challenge.id)
            const teamJoined = myTeamChallenges.some((item) => item.id === challenge.id)
            const isTeamOnly = (challenge.mode || 'individual') === 'team'
            return (
              <article key={challenge.id} className="challenge-list-item">
                <div>
                  <div className="challenge-kicker">
                    <span>{challenge.status}</span>
                    <span>{challenge.mode || 'individual'}</span>
                    <span>{challenge.scoring_method}</span>
                    <span>{marketLabel(challenge.market, language)} {challenge.symbol || 'all'}</span>
                  </div>
                  <Link to={`/challenges/${challenge.challenge_key}`} className="challenge-list-title">
                    {challenge.title}
                  </Link>
                  <div className="challenge-list-meta">
                    <span>{language === 'zh' ? "Người tham gia" : 'Participants'} {challenge.participant_count || 0}</span>
                    <span>{language === 'zh' ? "Nhóm" : 'Teams'} {challenge.team_count || 0}</span>
                    <span>{language === 'zh' ? "Kết thúc" : 'Ends'} {formatDate(challenge.end_at, language)}</span>
                    <span>{formatMoney(challenge.initial_capital)}</span>
                  </div>
                </div>
                <div className="challenge-list-actions">
                  {token && !isTeamOnly && challenge.status !== 'settled' && challenge.status !== 'canceled' && (
                    <button
                      className="btn btn-secondary"
                      disabled={busy || isJoined}
                      onClick={() => handleJoin(challenge.challenge_key)}
                    >
                      {isJoined ? (language === 'zh' ? "Đã tham gia" : 'Joined') : (language === 'zh' ? "Tham gia" : 'Join')}
                    </button>
                  )}
                  {token && isTeamOnly && teamJoined && (
                    <span className="challenge-badge">{language === 'zh' ? "Nhóm đã tham gia" : 'Team joined'}</span>
                  )}
                  <Link className="btn btn-ghost" to={`/challenges/${challenge.challenge_key}`}>
                    {language === 'zh' ? "Mở" : 'Open'}
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
