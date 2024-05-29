// commands/processPlaylist.js

import { execSync } from 'child_process'
import fs from 'fs'
import { processVideo } from './processVideo.js'

const ytAlias = `yt-dlp --no-warnings --extractor-args "youtube:player_client=ios,web"`

export async function processPlaylist(playlistUrl, model) {
  const episodeUrls = execSync(`${ytAlias} --flat-playlist -s --print "url" "${playlistUrl}"`)
  const urls = episodeUrls.toString().split('\n').filter(Boolean)
  fs.writeFileSync(`content/urls.md`, `${episodeUrls}`)
  for (const url of urls) {
    await processVideo(url, model)
  }
}