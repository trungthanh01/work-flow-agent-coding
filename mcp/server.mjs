import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import YAML from 'yaml'

const CONFIG_RELATIVE_PATH = '_core/config.yaml'

const DEFAULT_EXCLUDED_DIRS = new Set([
  '.git',
  '.obsidian',
  'node_modules',
  'mcp',
])

const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'this', 'that', 'these', 'those',
  'from', 'as', 'at', 'by',
  // vi (tối thiểu để giảm nhiễu)
  'và', 'hoặc', 'là', 'của', 'trong', 'cho', 'với', 'từ', 'đến', 'khi', 'nếu',
])

function getVaultRoot() {
  const envRoot = process.env.WFAC_VAULT_ROOT
  if (envRoot) return envRoot
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
}

function ensureInsideRepo({ vaultRoot, absPath }) {
  const rel = path.relative(vaultRoot, absPath)
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel))
    throw new Error('Unsafe path: outside vault root')
}

async function readTextFile(filePath) {
  return await fs.readFile(filePath, 'utf8')
}

async function writeTextFile(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, contents, 'utf8')
}

async function appendTextFile(filePath, contents) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.appendFile(filePath, contents, 'utf8')
}

function toIsoDateString(date) {
  return date.toISOString().slice(0, 10)
}

function slugify(input) {
  const normalized = String(input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
  const slug = normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
    .replace(/-+/g, '-')
  return slug || 'note'
}

function stripExt(filename) {
  return filename.replace(/\.[^/.]+$/, '')
}

async function loadConfig({ vaultRoot }) {
  const configPath = path.join(vaultRoot, CONFIG_RELATIVE_PATH)
  ensureInsideRepo({ vaultRoot, absPath: configPath })
  const raw = await readTextFile(configPath)
  const config = YAML.parse(raw)
  return { config, configPath }
}

function resolveFromVaultRoot(vaultRoot, maybeRelativePath) {
  if (!maybeRelativePath) return vaultRoot
  if (path.isAbsolute(maybeRelativePath)) return maybeRelativePath
  return path.join(vaultRoot, maybeRelativePath)
}

function tokenize(text) {
  if (!text) return []
  const raw = String(text)
    .toLowerCase()
    .normalize('NFKC')
    .split(/[^\p{L}\p{N}]+/gu)
    .filter(Boolean)
  return raw.filter((t) => t.length >= 2 && !STOPWORDS.has(t))
}

function scoreByOverlap({ queryTokens, haystackText }) {
  const hayTokens = new Set(tokenize(haystackText))
  let score = 0
  for (const t of queryTokens) {
    if (hayTokens.has(t)) score += 1
  }
  return score
}

function normalizedIsTemplatePath(relPath) {
  const n = relPath.replaceAll('\\', '/')
  return n.startsWith('_templates/')
}

function normalizedIsIndexFile(relPath) {
  return path.basename(relPath).toLowerCase() === 'index.md'
}

async function listMarkdownFilesRecursive({ baseDir, relativeDir = '' }) {
  const absDir = path.join(baseDir, relativeDir)
  const entries = await fs.readdir(absDir, { withFileTypes: true })

  const files = []
  for (const ent of entries) {
    const relPath = path.join(relativeDir, ent.name)
    const absPath = path.join(baseDir, relPath)

    if (ent.isDirectory()) {
      const normalized = relPath.replaceAll('\\', '/')
      if (DEFAULT_EXCLUDED_DIRS.has(ent.name) || DEFAULT_EXCLUDED_DIRS.has(normalized)) continue
      files.push(...(await listMarkdownFilesRecursive({ baseDir, relativeDir: relPath })))
      continue
    }

    if (!ent.isFile()) continue
    if (!ent.name.toLowerCase().endsWith('.md')) continue
    if (normalizedIsTemplatePath(relPath)) continue

    files.push({ absPath, relPath })
  }

  return files
}

async function readSnippet(absPath, maxChars = 6000) {
  const buf = await fs.readFile(absPath)
  const text = buf.toString('utf8')
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars)
}

function isPreferredZone(relNorm) {
  return (
    relNorm.startsWith('00_moc/') ||
    relNorm.startsWith('03_rules/framework/') ||
    relNorm.startsWith('01_memory/') ||
    relNorm.startsWith('02_problems/') ||
    relNorm.startsWith('04_lessons/')
  )
}

async function suggestLinks({
  vaultRoot,
  query,
  limit = 7,
  includeIndex = true,
  excludeRelPaths = [],
  excludeNoteNames = [],
}) {
  const queryTokens = tokenize(query)
  if (queryTokens.length === 0) return []

  const allFiles = await listMarkdownFilesRecursive({ baseDir: vaultRoot, relativeDir: '' })

  const excludeSet = new Set(excludeRelPaths.map((p) => p.replaceAll('\\', '/')))
  const excludeNotesSet = new Set(excludeNoteNames.map((n) => stripExt(String(n).trim())))

  const candidates = []
  for (const f of allFiles) {
    const relNorm = f.relPath.replaceAll('\\', '/')
    if (excludeSet.has(relNorm)) continue
    if (!isPreferredZone(relNorm)) continue
    if (!includeIndex && normalizedIsIndexFile(relNorm)) continue

    const snippet = await readSnippet(f.absPath, 9000)
    const filenameBoost = scoreByOverlap({ queryTokens, haystackText: path.basename(relNorm) }) * 2
    const contentScore = scoreByOverlap({ queryTokens, haystackText: snippet })
    const score = filenameBoost + contentScore
    if (score <= 0) continue

    candidates.push({
      relPath: relNorm,
      note: stripExt(path.basename(relNorm)),
      score,
    })
  }

  candidates.sort((a, b) => b.score - a.score)

  const seen = new Set()
  const picked = []
  for (const c of candidates) {
    if (excludeNotesSet.has(c.note)) continue
    if (seen.has(c.note)) continue
    seen.add(c.note)
    picked.push(c)
    if (picked.length >= limit) break
  }

  return picked
}

function extractHeadingSections(markdown) {
  const lines = String(markdown || '').split('\n')
  const sections = new Map()

  let current = null
  let buf = []

  function flush() {
    if (!current) return
    const text = buf.join('\n').trim()
    if (text) sections.set(current, text)
  }

  for (const line of lines) {
    const m = /^##\s+(.*)\s*$/.exec(line)
    if (m) {
      flush()
      current = m[1].trim()
      buf = []
      continue
    }
    if (!current) continue
    buf.push(line)
  }

  flush()
  return sections
}

function listH2Headings(markdown) {
  const lines = String(markdown || '').split('\n')
  const out = []
  const seen = new Set()
  for (const line of lines) {
    const m = /^##\s+(.*)\s*$/.exec(line)
    if (!m) continue
    const heading = m[1].trim()
    if (!heading) continue
    if (seen.has(heading)) continue
    seen.add(heading)
    out.push(heading)
  }
  return out
}

function extractBulletLines(text, max = 12) {
  const lines = String(text || '').split('\n')
  const bullets = []
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('1.') || trimmed.startsWith('2.')) {
      bullets.push(trimmed)
    }
    if (bullets.length >= max) break
  }
  return bullets
}

function uniqKeepOrder(items) {
  const out = []
  const seen = new Set()
  for (const it of items) {
    const key = String(it).trim()
    if (!key) continue
    if (seen.has(key)) continue
    seen.add(key)
    out.push(key)
  }
  return out
}

function buildRelateSolveFromSources({ query, sources }) {
  const extracted = sources.map((s) => {
    const sections = extractHeadingSections(s.text)
    const pick = (name) => sections.get(name) || ''
    return {
      note: s.note,
      score: s.score,
      symptoms: pick('Dấu hiệu (symptoms)'),
      root: pick('Nguyên nhân gốc (root cause)'),
      fix: pick('Cách xử (fix)'),
      prevention: pick('Cách phòng (prevention / guardrails)'),
      testPlan: pick('Test plan (tối thiểu)'),
      rollback: pick('Rollback plan'),
    }
  })

  const fixBullets = uniqKeepOrder(extracted.flatMap((e) => extractBulletLines(e.fix, 6)))
  const preventionBullets = uniqKeepOrder(extracted.flatMap((e) => extractBulletLines(e.prevention, 6)))
  const testBullets = uniqKeepOrder(extracted.flatMap((e) => extractBulletLines(e.testPlan, 6)))
  const rollbackBullets = uniqKeepOrder(extracted.flatMap((e) => extractBulletLines(e.rollback, 6)))

  const fallbackFix = [
    '- Chốt 1 entrypoint xử lý logic chung, tránh hardcode rải rác.',
    '- Thêm guardrails (validation/early return) để chặn edge-case gây lỗi lặp.',
  ]
  const fallbackPrevention = [
    '- Viết checklist review cho luồng này (để lần sau thêm tính năng không phá).',
    '- Thêm test tối thiểu cho happy path + 1–2 edge case.',
  ]
  const fallbackTest = [
    '- Manual: chạy lại đúng luồng gây lỗi + kiểm tra trạng thái sau khi hoàn tất.',
    '- Regression: test 1 luồng liên quan để đảm bảo không phá chỗ khác.',
  ]
  const fallbackRollback = [
    '- Rollback nhanh: revert commit/PR hoặc bật flag tắt tính năng mới.',
  ]

  const optionA = [
    '### Phương án A (nhanh, ít thay đổi)',
    ...(fixBullets.length ? fixBullets.slice(0, 3) : fallbackFix),
    '',
    '**Trade-off:** nhanh nhưng dễ để lại ngoại lệ nếu không có guardrails.',
  ].join('\n')

  const optionB = [
    '### Phương án B (bền, sạch)',
    ...(preventionBullets.length ? preventionBullets.slice(0, 3) : fallbackPrevention),
    '',
    '**Trade-off:** tốn thời gian refactor nhưng giảm rủi ro lặp lại.',
  ].join('\n')

  const optionC = [
    '### Phương án C (hệ thống hoá)',
    ...(testBullets.length ? testBullets.slice(0, 2) : fallbackTest),
    ...(rollbackBullets.length ? rollbackBullets.slice(0, 1) : fallbackRollback),
    '',
    '**Trade-off:** thêm chi phí quy trình nhưng tăng độ tin cậy.',
  ].join('\n')

  const patterns = extracted
    .slice(0, 3)
    .map((e) => `- [[${e.note}]] (score: ${e.score})`)
    .join('\n')

  const optionsMarkdown = [optionA, '', optionB, '', optionC].join('\n')
  const testPlanMarkdown = (testBullets.length ? testBullets : fallbackTest).slice(0, 6).join('\n')
  const rollbackMarkdown = (rollbackBullets.length ? rollbackBullets : fallbackRollback).slice(0, 4).join('\n')

  const recommendationMarkdown = [
    '### Khuyến nghị',
    '- Nếu cần “đỡ cháy” ngay: làm A trước.',
    '- Nếu đây là luồng quan trọng và dễ lặp: ưu tiên B + C.',
    '',
    '### Nguồn pattern trong vault',
    patterns || '- (Chưa tìm thấy note đủ giống; đang dùng fallback heuristics)',
  ].join('\n')

  return { optionsMarkdown, recommendationMarkdown, testPlanMarkdown, rollbackMarkdown }
}

async function insertEntryIntoIndex({
  vaultRoot,
  indexRelPath,
  anchorHeading,
  title,
  noteName,
  repo,
  status,
  created,
  includeTransclusion,
}) {
  const indexAbs = resolveFromVaultRoot(vaultRoot, indexRelPath)
  ensureInsideRepo({ vaultRoot, absPath: indexAbs })
  const indexText = await readTextFile(indexAbs)

  const anchorIdx = indexText.indexOf(anchorHeading)
  if (anchorIdx === -1)
    throw new Error(`INDEX.md missing anchor heading: "${anchorHeading}"`)

  const entry = [
    '',
    `### ${title}`,
    `- Link: [[${noteName}]]`,
    repo ? `- Repo nguồn: ${repo}` : null,
    status ? `- Trạng thái: ${status}` : null,
    created ? `- Ngày tạo: ${created}` : null,
    '',
    includeTransclusion ? `![[${noteName}]]` : null,
    '',
  ]
    .filter(Boolean)
    .join('\n')

  const afterAnchorIdx = indexText.indexOf('\n', anchorIdx)
  const updated = indexText.slice(0, afterAnchorIdx) + entry + indexText.slice(afterAnchorIdx)
  await writeTextFile(indexAbs, updated)
}

async function ensureIndexExists({ vaultRoot, indexRelPath, anchorHeading, title, updated }) {
  const indexAbs = resolveFromVaultRoot(vaultRoot, indexRelPath)
  ensureInsideRepo({ vaultRoot, absPath: indexAbs })
  try {
    const existing = await readTextFile(indexAbs)
    if (!existing.includes(anchorHeading))
      throw new Error(`INDEX exists but missing anchor heading: "${anchorHeading}"`)
    return
  } catch (err) {
    // If file is missing: create minimal index. Otherwise: rethrow.
    const msg = String(err?.message || '')
    const isMissing =
      msg.includes('ENOENT') ||
      msg.includes('no such file') ||
      msg.toLowerCase().includes('not found')
    if (!isMissing) throw err
  }

  const contents = [
    '---',
    'kind: index',
    `updated: ${updated}`,
    '---',
    '',
    `# ${title}`,
    '',
    '## Mục tiêu',
    '- Trang tổng hợp sống để đọc “một mạch”.',
    '',
    '---',
    '',
    anchorHeading,
    '',
  ].join('\n')

  await writeTextFile(indexAbs, contents)
}

async function getMocText({ vaultRoot, name, heading, maxChars }) {
  const { config } = await loadConfig({ vaultRoot })
  const mocRel = config?.paths?.moc?.[name]
  if (!mocRel) throw new Error(`Unknown MOC name: ${name}`)

  const mocAbs = resolveFromVaultRoot(vaultRoot, mocRel)
  ensureInsideRepo({ vaultRoot, absPath: mocAbs })
  const text = await readSnippet(mocAbs, maxChars)

  if (!heading?.trim()) return { mocRel, text }

  const sections = extractHeadingSections(text)
  const picked = sections.get(heading.trim())
  if (!picked) {
    const available = Array.from(sections.keys()).map((h) => `- ${h}`).join('\n')
    const hint = available ? `\n\nHeadings có sẵn:\n${available}` : ''
    throw new Error(`Không tìm thấy heading: "${heading.trim()}" trong ${mocRel}${hint}`)
  }

  return { mocRel, text: picked }
}

function createServer() {
  return new McpServer({
    name: 'workflow-agent-coding',
    version: '0.1.0',
  })
}

async function runHealthCheck({ vaultRoot }) {
  const required = [
    path.join(vaultRoot, '_core/config.yaml'),
    path.join(vaultRoot, '00_moc/00_main-moc.md'),
    path.join(vaultRoot, 'AGENTS.md'),
    path.join(vaultRoot, 'SETUP.md'),
  ]

  for (const abs of required) {
    ensureInsideRepo({ vaultRoot, absPath: abs })
    try {
      await fs.access(abs)
    } catch {
      throw new Error(`Missing required file: ${path.relative(vaultRoot, abs)}`)
    }
  }

  const { config } = await loadConfig({ vaultRoot })
  const anchor = config?.indexing?.anchor_heading || '## Danh sách (có nhúng nội dung)'
  const indexes = [
    '02_problems/frontend/INDEX.md',
    '02_problems/backend/INDEX.md',
    '04_lessons/INDEX.md',
    '03_rules/framework/INDEX.md',
  ]

  const errors = []
  for (const rel of indexes) {
    const abs = path.join(vaultRoot, rel)
    try {
      const text = await readTextFile(abs)
      if (!text.includes(anchor)) errors.push(`Missing anchor in ${rel}`)
    } catch {
      // index có thể chưa tồn tại trước onboarding → bỏ qua
    }
  }

  return errors
}

async function main() {
  const vaultRoot = getVaultRoot()

  if (process.argv.includes('--selftest')) {
    const { configPath } = await loadConfig({ vaultRoot })
    const ok = {
      vaultRoot,
      configPath,
    }
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(ok, null, 2))
    return
  }

  if (process.argv.includes('--selftest-suggest')) {
    const idx = process.argv.findIndex((a) => a === '--selftest-suggest')
    const query = process.argv[idx + 1] || ''
    const suggestions = await suggestLinks({ vaultRoot, query, limit: 7 })
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ query, suggestions }, null, 2))
    return
  }

  if (process.argv.includes('--selftest-research')) {
    const idx = process.argv.findIndex((a) => a === '--selftest-research')
    const query = process.argv[idx + 1] || ''
    const suggestions = await suggestLinks({ vaultRoot, query, limit: 5 })
    const sources = []
    for (const s of suggestions.slice(0, 3)) {
      const abs = resolveFromVaultRoot(vaultRoot, s.relPath)
      const text = await readSnippet(abs, 12000)
      sources.push({ ...s, text })
    }
    const solved = buildRelateSolveFromSources({ query, sources })
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ query, suggestions, solved }, null, 2))
    return
  }

  const server = createServer()

  server.tool(
    'wfac_get_moc',
    {
      name: z.string().default('main'),
      heading: z.string().optional(),
      listHeadings: z.boolean().default(false),
      maxChars: z.number().int().min(2000).max(60000).default(20000),
    },
    async ({ name, heading, listHeadings, maxChars }) => {
      const { mocRel, text } = await getMocText({ vaultRoot, name, heading, maxChars })

      if (listHeadings) {
        const headings = listH2Headings(text)
        const body = headings.length
          ? headings.map((h) => `- ${h}`).join('\n')
          : '- (Không tìm thấy heading dạng "## ...")'

        return {
          content: [{ type: 'text', text: `## MOC: ${mocRel}\n\n## Headings\n${body}`.trim() }],
        }
      }

      const header = heading?.trim()
        ? `## MOC: ${mocRel}\n## Heading: ${heading.trim()}\n`
        : `## MOC: ${mocRel}\n`

      return {
        content: [{ type: 'text', text: `${header}\n${text}`.trim() }],
      }
    }
  )

  server.tool(
    'wfac_append_memory',
    {
      markdown: z.string().min(1),
      separator: z.enum(['hr', 'none']).default('hr'),
    },
    async ({ markdown, separator }) => {
      const { config } = await loadConfig({ vaultRoot })
      const memoryRel = config?.paths?.memory?.default || '01_memory/MEMORY.md'
      const memoryAbs = resolveFromVaultRoot(vaultRoot, memoryRel)
      ensureInsideRepo({ vaultRoot, absPath: memoryAbs })

      const block = separator === 'hr'
        ? `\n\n---\n\n${markdown.trim()}\n`
        : `\n\n${markdown.trim()}\n`

      await appendTextFile(memoryAbs, block)

      return {
        content: [{ type: 'text', text: `OK: appended to ${memoryRel}` }],
      }
    }
  )

  server.tool(
    'wfac_suggest_links',
    {
      query: z.string().min(1),
      limit: z.number().int().min(1).max(20).default(7),
      includeIndex: z.boolean().default(true),
      excludeNotes: z.array(z.string()).default([]),
    },
    async ({ query, limit, includeIndex, excludeNotes }) => {
      const suggestions = await suggestLinks({
        vaultRoot,
        query,
        limit,
        includeIndex,
        excludeNoteNames: excludeNotes,
      })

      const lines = suggestions.map((s) => `- [[${s.note}]] (score: ${s.score})`)
      return {
        content: [{ type: 'text', text: lines.join('\n') }],
      }
    }
  )

  server.tool(
    'wfac_research_solution',
    {
      query: z.string().min(1),
      limitLinks: z.number().int().min(1).max(20).default(7),
      maxSources: z.number().int().min(1).max(5).default(3),
      includeIndex: z.boolean().default(true),
      excludeNotes: z.array(z.string()).default([]),
    },
    async ({ query, limitLinks, maxSources, includeIndex, excludeNotes }) => {
      const suggestions = await suggestLinks({
        vaultRoot,
        query,
        limit: limitLinks,
        includeIndex,
        excludeNoteNames: excludeNotes,
      })

      const sources = []
      for (const s of suggestions.slice(0, maxSources)) {
        const abs = resolveFromVaultRoot(vaultRoot, s.relPath)
        const text = await readSnippet(abs, 12000)
        sources.push({ ...s, text })
      }

      const solved = buildRelateSolveFromSources({ query, sources })

      const linksList = suggestions
        .map((s) => `- [[${s.note}]] (score: ${s.score})`)
        .join('\n')

      const body = [
        '## Relate (notes liên quan)',
        linksList || '- (Không tìm thấy note liên quan)',
        '',
        '## Solve (phương án + trade-off)',
        solved.optionsMarkdown,
        '',
        '## Khuyến nghị',
        solved.recommendationMarkdown,
        '',
        '## Test plan (gợi ý)',
        solved.testPlanMarkdown,
        '',
        '## Rollback plan (gợi ý)',
        solved.rollbackMarkdown,
      ].join('\n')

      return {
        content: [{ type: 'text', text: body }],
      }
    }
  )

  server.tool(
    'wfac_capture_problem',
    {
      area: z.enum(['frontend', 'backend']),
      repo: z.string().min(1),
      title: z.string().min(1),
      status: z.string().default('draft'),
      tags: z.array(z.string()).default([]),
      created: z.string().optional(), // yyyy-mm-dd
      summary: z.string().optional(),
      symptoms: z.string().optional(),
      context: z.string().optional(),
      diagnosis: z.string().optional(),
      rootCause: z.string().optional(),
      goal: z.string().optional(),
      options: z.string().optional(),
      recommendation: z.string().optional(),
      fix: z.string().optional(),
      prevention: z.string().optional(),
      testPlan: z.string().optional(),
      rollbackPlan: z.string().optional(),
      evidence: z.string().optional(),
      links: z.string().optional(),
      slug: z.string().optional(),
      autoSolve: z.boolean().default(true),
      includeTransclusion: z.boolean().optional(),
    },
    async (args) => {
      const { config } = await loadConfig({ vaultRoot })
      const created = args.created?.trim() || toIsoDateString(new Date())

      const shortArea = args.area === 'frontend' ? 'fe' : 'be'
      const safeSlug = args.slug?.trim() ? slugify(args.slug) : slugify(args.title)
      const filename = `${shortArea}-${created}-${safeSlug}.md`
      const noteName = stripExt(filename)

      const problemsDirRel = args.area === 'frontend'
        ? '02_problems/frontend'
        : '02_problems/backend'

      const indexRel = `${problemsDirRel}/INDEX.md`
      const noteRel = `${problemsDirRel}/${filename}`
      const noteAbs = resolveFromVaultRoot(vaultRoot, noteRel)
      ensureInsideRepo({ vaultRoot, absPath: noteAbs })

      const baseQuery = [
        args.title,
        args.summary,
        args.symptoms,
        args.context,
        args.diagnosis,
        args.rootCause,
        args.fix,
        args.prevention,
      ]
        .filter(Boolean)
        .join('\n')

      let links = args.links
      if (!links?.trim()) {
        const suggestions = await suggestLinks({
          vaultRoot,
          query: baseQuery,
          limit: 7,
          includeIndex: true,
          excludeRelPaths: [noteRel],
          excludeNoteNames: [],
        })
        const suggestionLines = suggestions.map((s) => `- [[${s.note}]]`)
        links = ['- [[00_moc/00_main-moc]]', ...suggestionLines].join('\n')
      }

      let options = args.options
      let recommendation = args.recommendation
      let testPlan = args.testPlan
      let rollbackPlan = args.rollbackPlan

      const shouldAutoSolve =
        args.autoSolve &&
        (!options?.trim() || !recommendation?.trim() || !testPlan?.trim() || !rollbackPlan?.trim())

      if (shouldAutoSolve) {
        const suggestions = await suggestLinks({
          vaultRoot,
          query: baseQuery,
          limit: 7,
          includeIndex: true,
          excludeRelPaths: [noteRel],
          excludeNoteNames: [],
        })

        const sources = []
        for (const s of suggestions.slice(0, 3)) {
          const abs = resolveFromVaultRoot(vaultRoot, s.relPath)
          const text = await readSnippet(abs, 12000)
          sources.push({ ...s, text })
        }

        const solved = buildRelateSolveFromSources({ query: baseQuery, sources })
        if (!options?.trim()) options = solved.optionsMarkdown
        if (!recommendation?.trim()) recommendation = solved.recommendationMarkdown
        if (!testPlan?.trim()) testPlan = solved.testPlanMarkdown
        if (!rollbackPlan?.trim()) rollbackPlan = solved.rollbackMarkdown
      }

      const frontmatter = [
        '---',
        'kind: problem',
        `area: ${args.area}`,
        `repo: ${args.repo}`,
        `created: ${created}`,
        `status: ${args.status}`,
        `tags: [${args.tags.map((t) => JSON.stringify(String(t))).join(', ')}]`,
        '---',
        '',
      ].join('\n')

      const body = [
        '## Tóm tắt (1–3 dòng)',
        args.summary?.trim() || '',
        '',
        '## Dấu hiệu (symptoms)',
        args.symptoms?.trim() || '',
        '',
        '## Bối cảnh',
        args.context?.trim() || '',
        '',
        '## Chẩn đoán',
        args.diagnosis?.trim() || '',
        '',
        '## Nguyên nhân gốc (root cause)',
        args.rootCause?.trim() || '',
        '',
        '## Mục tiêu & tiêu chí thành công',
        args.goal?.trim() || '',
        '',
        '## Phương án (ít nhất 2) + trade-off',
        options?.trim() || '',
        '',
        '## Khuyến nghị (chốt 1 hướng)',
        recommendation?.trim() || '',
        '',
        '## Cách xử (fix)',
        args.fix?.trim() || '',
        '',
        '## Cách phòng (prevention / guardrails)',
        args.prevention?.trim() || '',
        '',
        '## Test plan (tối thiểu)',
        testPlan?.trim() || '',
        '',
        '## Rollback plan',
        rollbackPlan?.trim() || '',
        '',
        '## Vết tích (evidence)',
        args.evidence?.trim() || '',
        '',
        '## Liên kết liên quan (wiki links)',
        links?.trim() || '- [[00_moc/00_main-moc]]',
        '',
      ].join('\n')

      await writeTextFile(noteAbs, frontmatter + body)

      const anchor = config?.indexing?.anchor_heading || '## Danh sách (có nhúng nội dung)'
      const includeTransclusion =
        typeof args.includeTransclusion === 'boolean'
          ? args.includeTransclusion
          : Boolean(config?.indexing?.include_transclusion_default)

      await ensureIndexExists({
        vaultRoot,
        indexRelPath: indexRel,
        anchorHeading: anchor,
        title: `Problems (${args.area === 'frontend' ? 'Frontend' : 'Backend'})`,
        updated: created,
      })

      await insertEntryIntoIndex({
        vaultRoot,
        indexRelPath: indexRel,
        anchorHeading: anchor,
        title: args.title,
        noteName,
        repo: args.repo,
        status: args.status,
        created,
        includeTransclusion,
      })

      return {
        content: [{ type: 'text', text: `OK: created [[${noteName}]] and updated INDEX.md` }],
      }
    }
  )

  server.tool(
    'wfac_extract_lesson',
    {
      problemNote: z.string().min(1), // note name (no .md) OR relative path to .md
      repo: z.string().min(1),
      area: z.enum(['frontend', 'backend']).optional(),
      created: z.string().optional(),
      status: z.string().default('draft'),
      evidence: z.string().optional(),
      lesson: z.string().optional(),
      signals: z.array(z.string()).default([]),
      guardrails: z.array(z.string()).default([]),
      checks: z.array(z.string()).default([]),
    },
    async (args) => {
      const { config } = await loadConfig({ vaultRoot })
      const created = args.created?.trim() || toIsoDateString(new Date())

      const problemRel = args.problemNote.endsWith('.md')
        ? args.problemNote
        : [
            `02_problems/frontend/${args.problemNote}.md`,
            `02_problems/backend/${args.problemNote}.md`,
          ]

      let problemAbs = null
      let problemText = null

      if (Array.isArray(problemRel)) {
        for (const rel of problemRel) {
          const abs = resolveFromVaultRoot(vaultRoot, rel)
          try {
            problemText = await readTextFile(abs)
            problemAbs = abs
            break
          } catch {
            continue
          }
        }
      } else {
        const abs = resolveFromVaultRoot(vaultRoot, problemRel)
        problemText = await readTextFile(abs)
        problemAbs = abs
      }

      if (!problemAbs || !problemText)
        throw new Error(`Không tìm thấy problem note: ${args.problemNote}`)

      const sections = extractHeadingSections(problemText)
      const rootCause = sections.get('Nguyên nhân gốc (root cause)') || ''
      const prevention = sections.get('Cách phòng (prevention / guardrails)') || ''
      const symptoms = sections.get('Dấu hiệu (symptoms)') || ''
      const titleLine = (sections.get('Tóm tắt (1–3 dòng)') || '').split('\n')[0]?.trim()

      const inferredSignals = extractBulletLines(symptoms, 6)
      const inferredGuardrails = extractBulletLines(prevention, 8)

      const noteName = stripExt(path.basename(problemAbs))
      const lessonSlug = slugify(args.lesson || titleLine || noteName)
      const filename = `lesson-${created}-${lessonSlug}.md`
      const lessonName = stripExt(filename)
      const lessonRel = `04_lessons/${filename}`
      const lessonAbs = resolveFromVaultRoot(vaultRoot, lessonRel)
      ensureInsideRepo({ vaultRoot, absPath: lessonAbs })

      const finalSignals = uniqKeepOrder([...(args.signals || []), ...inferredSignals]).slice(0, 3)
      const finalGuardrails = uniqKeepOrder([...(args.guardrails || []), ...inferredGuardrails]).slice(0, 3)
      const finalChecks = uniqKeepOrder([...(args.checks || []), '- [ ] Thêm test tối thiểu cho happy path + 1 edge case.']).slice(0, 5)

      const content = [
        '---',
        'kind: lesson',
        `area: ${args.area || 'frontend'}`,
        `repo: ${args.repo}`,
        `created: ${created}`,
        `status: ${args.status}`,
        'tags: []',
        '---',
        '',
        '## Bài học (1 câu)',
        args.lesson?.trim()
          ? args.lesson.trim()
          : `Rút bài học từ [[${noteName}]] để tránh lặp lỗi.`,
        '',
        '## Tín hiệu nhận biết sớm',
        finalSignals.length ? finalSignals.map((s) => (s.startsWith('- ') ? s : `- ${s}`)).join('\n') : '- (chưa có)',
        '',
        '## Nguyên nhân gốc',
        rootCause.trim() || '(chưa có)',
        '',
        '## Guardrails (để khỏi lặp)',
        finalGuardrails.length ? finalGuardrails.map((g) => (g.startsWith('- ') ? g : `- ${g}`)).join('\n') : '- (chưa có)',
        '',
        '## Checklist PR (3–7 gạch)',
        finalChecks.join('\n'),
        '',
        '## Liên kết',
        `- Problem: [[${noteName}]]`,
        `- Vết tích: ${args.evidence?.trim() || '(chưa có)'}`,
        '',
      ].join('\n')

      await writeTextFile(lessonAbs, content)

      const anchor = config?.indexing?.anchor_heading || '## Danh sách (có nhúng nội dung)'

      await ensureIndexExists({
        vaultRoot,
        indexRelPath: '04_lessons/INDEX.md',
        anchorHeading: anchor,
        title: 'Lessons (Bài học)',
        updated: created,
      })

      await insertEntryIntoIndex({
        vaultRoot,
        indexRelPath: '04_lessons/INDEX.md',
        anchorHeading: anchor,
        title: args.lesson?.trim() || `Lesson từ ${noteName}`,
        noteName: lessonName,
        repo: args.repo,
        status: args.status,
        created,
        includeTransclusion: Boolean(config?.indexing?.include_transclusion_default),
      })

      return {
        content: [{ type: 'text', text: `OK: created [[${lessonName}]] and updated 04_lessons/INDEX.md` }],
      }
    }
  )

  server.tool(
    'wfac_health_check',
    {},
    async () => {
      const errors = await runHealthCheck({ vaultRoot })
      if (errors.length === 0) {
        return { content: [{ type: 'text', text: 'Health check: OK' }] }
      }
      return { content: [{ type: 'text', text: `Health check: FAILED\n- ${errors.join('\n- ')}` }] }
    }
  )

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err)
  process.exitCode = 1
})

