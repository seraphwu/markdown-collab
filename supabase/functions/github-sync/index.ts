// supabase/functions/github-sync/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { markdown, path, username } = await req.json()
    const githubPat = Deno.env.get('VITE_GITHUB_PAT')

    if (!githubPat) {
      throw new Error("Missing VITE_GITHUB_PAT environment variable.")
    }

    const repo = "seraphwu/markdown-collab"
    const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`
    
    // 1. Check if the file already exists to get its SHA
    let sha = undefined;
    const getRes = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${githubPat}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Markdown-Collab-Function'
      }
    });

    if (getRes.ok) {
      const currentFileData = await getRes.json();
      sha = currentFileData.sha;
    }

    // 2. Base64 encode the markdown string
    // Need to correctly handle UTF-8 characters
    const encoder = new TextEncoder();
    const encodedContent = btoa(String.fromCharCode(...encoder.encode(markdown)));

    // 3. Put the new content
    const putRes = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        'Authorization': `token ${githubPat}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Markdown-Collab-Function'
      },
      body: JSON.stringify({
        message: `Sync file update via Collab App by ${username || 'Unknown'}`,
        content: encodedContent,
        sha
      })
    });

    const result = await putRes.json();
    
    if (!putRes.ok) {
      throw new Error(`GitHub API Error: ${result.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, url: result.content?.html_url }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
