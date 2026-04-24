export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(),
      })
    }

    if (url.pathname !== '/search') {
      return json({ error: 'Not found' }, 404)
    }

    const q = (url.searchParams.get('q') || '').trim()
    const num = Math.min(Math.max(parseInt(url.searchParams.get('num') || '24', 10), 1), 40)

    if (!q) {
      return json({ error: 'Missing q parameter' }, 400)
    }

    if (!env.SERP_API_KEY) {
      return json({ error: 'SERP API key is not configured in worker secrets' }, 500)
    }

    const serpUrl = new URL('https://serpapi.com/search.json')
    serpUrl.searchParams.set('api_key', env.SERP_API_KEY)
    serpUrl.searchParams.set('engine', 'google_images')
    serpUrl.searchParams.set('google_domain', 'google.no')
    serpUrl.searchParams.set('hl', 'no')
    serpUrl.searchParams.set('gl', 'no')
    serpUrl.searchParams.set('location', 'Oslo, Oslo, Norway')
    serpUrl.searchParams.set('q', q)
    serpUrl.searchParams.set('num', String(num))

    try {
      const response = await fetch(serpUrl.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      const bodyText = await response.text()

      return new Response(bodyText, {
        status: response.status,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          ...corsHeaders(),
        },
      })
    } catch {
      return json({ error: 'Failed to fetch from SerpApi' }, 502)
    }
  },
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
  }
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders(),
    },
  })
}
