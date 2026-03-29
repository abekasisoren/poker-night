import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const BEER_ITEM = 'Beer (6-pack)'
const BEER_CATEGORY = 'drinks'

/**
 * POST /api/sessions/[id]/bring/rsvp-change
 *
 * Called automatically when a player changes their RSVP after bring items
 * have already been distributed.
 *
 * Body: { player_id: string, new_response: string }
 *
 * Logic:
 *  - new_response === 'yes'  → late joiner: add Beer (6-pack) if no item yet
 *  - new_response !== 'yes'  → dropout:
 *      • had Beer         → just delete it (no replacement needed)
 *      • had premium item → reassign it to a beer player, delete their beer
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { player_id, new_response } = await req.json()

  if (!player_id || !new_response) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const supabase = createServerClient()
  const sessionId = params.id

  // Fetch all current bring items for this session
  const { data: allItems, error: fetchError } = await supabase
    .from('bring_items')
    .select('*')
    .eq('session_id', sessionId)

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })

  // If no bring items exist yet, distribution hasn't happened — nothing to do
  if (!allItems || allItems.length === 0) {
    return NextResponse.json({ action: 'none', reason: 'no items distributed yet' })
  }

  // Find this player's current assignment (if any)
  const playerItem = allItems.find((i) => i.player_id === player_id)

  // ── Late joiner ──────────────────────────────────────────────────────────
  if (new_response === 'yes') {
    if (playerItem) {
      // Already has an item (e.g. re-confirming) — nothing to do
      return NextResponse.json({ action: 'none', reason: 'already assigned' })
    }

    // Assign Beer (6-pack) to the late joiner
    const { data: newItem, error: insertError } = await supabase
      .from('bring_items')
      .insert({
        session_id: sessionId,
        player_id,
        item: BEER_ITEM,
        category: BEER_CATEGORY,
      })
      .select('*')
      .single()

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
    return NextResponse.json({ action: 'added_beer', item: newItem })
  }

  // ── Late dropout ─────────────────────────────────────────────────────────
  if (!playerItem) {
    // No assignment to clean up
    return NextResponse.json({ action: 'none', reason: 'no item assigned' })
  }

  const isBeer = playerItem.item === BEER_ITEM

  if (isBeer) {
    // Just remove the beer slot — there will simply be one fewer beer
    const { error: deleteError } = await supabase
      .from('bring_items')
      .delete()
      .eq('id', playerItem.id)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
    return NextResponse.json({ action: 'removed_beer' })
  }

  // Premium item (Nuts / Fruit / Coke / Ice):
  // Find a beer player to inherit the premium assignment
  const beerItems = allItems.filter(
    (i) => i.item === BEER_ITEM && i.player_id !== player_id
  )

  if (beerItems.length === 0) {
    // No beer players available — just remove the item
    const { error: deleteError } = await supabase
      .from('bring_items')
      .delete()
      .eq('id', playerItem.id)

    if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
    return NextResponse.json({ action: 'removed_premium_no_replacement' })
  }

  // Pick the first beer player to take over the premium item
  const targetBeerItem = beerItems[0]

  // Reassign the premium item to the beer player
  const { error: updateError } = await supabase
    .from('bring_items')
    .update({ player_id: targetBeerItem.player_id })
    .eq('id', playerItem.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Delete the beer player's old beer assignment
  const { error: deleteBeerError } = await supabase
    .from('bring_items')
    .delete()
    .eq('id', targetBeerItem.id)

  if (deleteBeerError) return NextResponse.json({ error: deleteBeerError.message }, { status: 500 })

  return NextResponse.json({
    action: 'reassigned_premium',
    item: playerItem.item,
    to_player_id: targetBeerItem.player_id,
  })
}
