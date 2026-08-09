import { useEffect } from 'react'

const AD_CLIENT = 'ca-pub-1915165369435716'

// حط هنا Ad Slot ID اللي عطاك Google AdSense
const AD_SLOT = 'YOUR_AD_SLOT_ID'

function AdBanner({ slot = AD_SLOT, className = '' }) {
  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (err) {
      console.error('AdSense push failed', err)
    }
  }, [])

  return (
    <div className={`ad-slot ${className}`.trim()}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}

export default AdBanner