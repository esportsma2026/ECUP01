function TeamBadge({ team, className }) {
  let h = 0
  if (team) {
    for (const ch of team.code) h = (h * 31 + ch.charCodeAt(0)) % 360
  }
  const hue = h || 260
  return (
    <span
      className={`team-badge ${className || ''}`}
      style={{
        background: `linear-gradient(135deg, hsl(${hue}, 72%, 34%), hsl(${(hue + 50) % 360}, 78%, 20%))`,
      }}
    >
      {team ? team.code : '—'}
    </span>
  )
}

export default TeamBadge
