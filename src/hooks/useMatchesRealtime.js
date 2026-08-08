import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { clearCache } from '../data/effotbaleDb'

/**
 * Subscribes to realtime changes on the `matches` table. Whenever a row
 * changes (insert/update/delete), the data-layer cache is cleared and the
 * provided reload callback is invoked — so Standings, Knockout and Matches
 * refresh instantly without a full page reload.
 */
export function useMatchesRealtime(onChange) {
  const cbRef = useRef(onChange)
  cbRef.current = onChange

  useEffect(() => {
    const channel = supabase
      .channel('matches-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches' },
        () => {
          clearCache()
          if (cbRef.current) cbRef.current()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
