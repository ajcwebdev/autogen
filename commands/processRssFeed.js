// commands/processRssFeed.js

import { XMLParser } from 'fast-xml-parser'
import { execSync } from 'child_process'
import fs from 'fs'
import { processLrcToTxt, concatenateFinalContent } from '../utils/index.js'

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  allowBooleanAttributes: true,
})

async function processRssItem(item, model) {
  try {
    const id = `content/${item.publishDate}-${item.title.replace(/[^a-zA-Z0-9]/g, '_')}`
    const mdContent = [
      "---",
      `showLink: "${item.showLink}"`,
      `channel: "${item.channel}"`,
      `channelURL: "${item.channelURL}"`,
      `title: "${item.title}"`,
      `publishDate: "${item.publishDate}"`,
      `coverImage: "${item.coverImage}"`,
      "---\n"
    ].join('\n')

    fs.writeFileSync(`${id}.md`, mdContent)
    console.log(`Markdown file completed successfully: ${id}.md`)

    execSync(`ffmpeg -i "${item.showLink}" -ar 16000 "${id}.wav"`)
    console.log(`WAV file completed successfully: ${id}.wav`)

    execSync(`./whisper.cpp/main -m "${model}" -f "${id}.wav" -of "${id}" --output-lrc`)
    console.log(`Transcript file completed successfully: ${id}.lrc`)

    const txtContent = processLrcToTxt(id)

    const finalContent = concatenateFinalContent(id, txtContent)
    fs.writeFileSync(`${id}.md`, finalContent)
    console.log(`Prompt concatenated to transformed transcript successfully: ${id}.md`)

    // cleanUpFiles(id)
    console.log(`Process completed successfully for RSS item: ${item.title}`)
  } catch (error) {
    console.error(`Error processing RSS item: ${item.title}`, error)
  }
}

export async function processRssFeed(rssUrl, model) {
  try {
    const response = await fetch(rssUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/rss+xml',
      },
      timeout: 5000,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const buffer = await response.arrayBuffer()
    const text = Buffer.from(buffer).toString('utf-8')
    const feed = parser.parse(text)
    const channelTitle = feed.rss.channel.title
    const channelLink = feed.rss.channel.link
    const channelImage = feed.rss.channel.image.url

    const dateFormatter = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })

    const items = feed.rss.channel.item.map(item => ({
      showLink: item.enclosure.url,
      channel: channelTitle,
      channelURL: channelLink,
      title: item.title,
      publishDate: dateFormatter.format(new Date(item.pubDate)),
      coverImage: item['itunes:image']?.href || channelImage,
    }))

    for (const item of items) {
      await processRssItem(item, model)
    }
  } catch (error) {
    console.error('Error fetching or parsing feed:', error)
  }
}