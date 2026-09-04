#!/usr/bin/env node
/**
 * Jira adapter for the Beep PM agent.
 *
 * Two modes, chosen automatically:
 *   live    — JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN and JIRA_PROJECT_KEY are
 *             all set. Talks to the Jira Cloud REST API.
 *   dry-run — any of those is missing. Writes the exact payload it *would* have
 *             sent to pipeline/<slug>/jira/ and prints it.
 *
 * Dry-run is a first-class mode, not a failure. The agent is instructed to say
 * plainly when it is in dry-run rather than implying a real issue exists.
 *
 * Usage:
 *   node tools/jira.mjs create  --slug <slug> --spec 02-spec.v1.md
 *   node tools/jira.mjs update  --slug <slug> --spec 02-spec.v2.md
 *   node tools/jira.mjs comment --slug <slug> --changelog
 *   node tools/jira.mjs comment --slug <slug> --text "Some comment"
 *   node tools/jira.mjs verify
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

/** Minimal .env reader — avoids a dependency for four keys. */
function loadEnv() {
  const path = join(ROOT, '.env');
  if (!existsSync(path)) return;

  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    const eq = line.indexOf('=');
    if (eq === -1) continue;

    const key = line.slice(0, eq).trim();
    // Strip surrounding quotes if the user added them.
    const value = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv();

const CONFIG = {
  baseUrl: (process.env.JIRA_BASE_URL ?? '').replace(/\/$/, ''),
  email: process.env.JIRA_EMAIL ?? '',
  token: process.env.JIRA_API_TOKEN ?? '',
  projectKey: process.env.JIRA_PROJECT_KEY ?? '',
  issueType: process.env.JIRA_ISSUE_TYPE ?? 'Task',
};

const IS_LIVE = Boolean(
  CONFIG.baseUrl && CONFIG.email && CONFIG.token && CONFIG.projectKey,
);

// ---------------------------------------------------------------------------
// Markdown -> Atlassian Document Format
// ---------------------------------------------------------------------------

/**
 * Jira Cloud's v3 API takes ADF, not markdown or wiki markup. This handles the
 * subset our specs actually use: headings, bullets, and paragraphs. Anything
 * else degrades to a plain paragraph, which is lossy but never breaks the call.
 */
function markdownToAdf(markdown) {
  const content = [];
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length === 0) return;
    content.push({
      type: 'bulletList',
      content: listBuffer.map((text) => ({
        type: 'listItem',
        content: [paragraph(text)],
      })),
    });
    listBuffer = [];
  };

  for (const raw of markdown.split('\n')) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      flushList();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushList();
      content.push({
        type: 'heading',
        attrs: { level: Math.min(heading[1].length, 6) },
        content: [{ type: 'text', text: stripInline(heading[2]) }],
      });
      continue;
    }

    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      listBuffer.push(stripInline(bullet[1]));
      continue;
    }

    flushList();
    content.push(paragraph(stripInline(line)));
  }

  flushList();

  // ADF rejects an empty document.
  if (content.length === 0) content.push(paragraph('(empty)'));

  return { type: 'doc', version: 1, content };
}

function paragraph(text) {
  return { type: 'paragraph', content: [{ type: 'text', text: text || ' ' }] };
}

/** ADF has no inline markdown, so drop the markers rather than show them raw. */
function stripInline(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\((.+?)\)/g, '$1 ($2)')
    .replace(/^\|/, '')
    .trim();
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

async function jiraFetch(path, options = {}) {
  const auth = Buffer.from(`${CONFIG.email}:${CONFIG.token}`).toString('base64');

  const response = await fetch(`${CONFIG.baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Jira ${response.status} ${response.statusText} on ${path}\n${text}`,
    );
  }

  return text ? JSON.parse(text) : {};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function args() {
  const out = { _: [] };
  const argv = process.argv.slice(2);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = true;
      } else {
        out[key] = next;
        i++;
      }
    } else {
      out._.push(arg);
    }
  }

  return out;
}

function pipelineDir(slug) {
  return join(ROOT, 'pipeline', slug);
}

function readState(slug) {
  const path = join(pipelineDir(slug), 'state.json');
  if (!existsSync(path)) {
    throw new Error(`No state.json for "${slug}". Run /scope-problem first.`);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeState(slug, state) {
  writeFileSync(
    join(pipelineDir(slug), 'state.json'),
    `${JSON.stringify(state, null, 2)}\n`,
    'utf8',
  );
}

/** Records what a dry run would have sent, so it can be inspected or replayed. */
function recordDryRun(slug, action, payload) {
  const dir = join(pipelineDir(slug), 'jira');
  mkdirSync(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = join(dir, `${stamp}-${action}.json`);

  writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

  console.log(`[dry-run] No Jira credentials found — nothing was sent.`);
  console.log(`[dry-run] Payload for "${action}" written to:`);
  console.log(`          ${file}`);
  console.log(JSON.stringify(payload, null, 2));

  return file;
}

/** First heading becomes the issue summary; falls back to the state title. */
function summaryFrom(markdown, fallback) {
  const heading = markdown.split('\n').find((l) => /^#\s+/.test(l.trim()));
  return heading ? heading.replace(/^#\s+/, '').trim() : fallback;
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function create(opts) {
  const slug = requireSlug(opts);
  const state = readState(slug);
  const spec = readSpec(slug, opts);

  const summary = summaryFrom(spec, state.title ?? slug);
  const description = buildDescription(spec, state);

  const payload = {
    fields: {
      project: { key: CONFIG.projectKey },
      issuetype: { name: CONFIG.issueType },
      summary: summary.slice(0, 250),
      description: markdownToAdf(description),
    },
  };

  if (!IS_LIVE) {
    recordDryRun(slug, 'create', payload);
    return;
  }

  const result = await jiraFetch('/rest/api/3/issue', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  state.jiraKey = result.key;
  writeState(slug, state);

  console.log(`Created ${result.key}`);
  console.log(`${CONFIG.baseUrl}/browse/${result.key}`);
}

async function update(opts) {
  const slug = requireSlug(opts);
  const state = readState(slug);
  const spec = readSpec(slug, opts);

  if (!state.jiraKey && IS_LIVE) {
    throw new Error(`No jiraKey in state.json for "${slug}". Run create first.`);
  }

  const payload = {
    fields: {
      summary: summaryFrom(spec, state.title ?? slug).slice(0, 250),
      description: markdownToAdf(buildDescription(spec, state)),
    },
  };

  if (!IS_LIVE) {
    recordDryRun(slug, `update-${state.jiraKey ?? 'unknown'}`, payload);
    return;
  }

  await jiraFetch(`/rest/api/3/issue/${state.jiraKey}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  console.log(`Updated ${state.jiraKey}`);
  console.log(`${CONFIG.baseUrl}/browse/${state.jiraKey}`);
}

async function comment(opts) {
  const slug = requireSlug(opts);
  const state = readState(slug);

  let body;
  if (opts.changelog) {
    const path = join(pipelineDir(slug), 'CHANGELOG.md');
    if (!existsSync(path)) throw new Error(`No CHANGELOG.md for "${slug}".`);

    // Post only the newest entry, not the whole history.
    const entries = readFileSync(path, 'utf8').split(/^## /m).filter(Boolean);
    body = `## ${entries[entries.length - 1].trim()}`;
  } else if (typeof opts.text === 'string') {
    body = opts.text;
  } else {
    throw new Error('comment needs --changelog or --text "..."');
  }

  const payload = { body: markdownToAdf(body) };

  if (!IS_LIVE) {
    recordDryRun(slug, `comment-${state.jiraKey ?? 'unknown'}`, payload);
    return;
  }

  await jiraFetch(`/rest/api/3/issue/${state.jiraKey}/comment`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  console.log(`Commented on ${state.jiraKey}`);
}

/**
 * Lists the projects this account can see. Used when setting up, to find the
 * right JIRA_PROJECT_KEY without hunting through the Jira UI.
 */
async function projects() {
  if (!CONFIG.baseUrl || !CONFIG.email || !CONFIG.token) {
    throw new Error('Need JIRA_BASE_URL, JIRA_EMAIL and JIRA_API_TOKEN in .env');
  }

  const me = await jiraFetch('/rest/api/3/myself');
  console.log(`Authenticated as: ${me.displayName} <${me.emailAddress}>\n`);

  const result = await jiraFetch('/rest/api/3/project/search?maxResults=50');

  if (!result.values?.length) {
    console.log('No projects found. Create one in Jira first, then re-run.');
    return;
  }

  console.log(`Projects (${result.values.length}):`);
  for (const project of result.values) {
    console.log(`  ${project.key.padEnd(10)} ${project.name}  [${project.style ?? '?'}]`);
  }
  console.log(`\nSet JIRA_PROJECT_KEY in .env to one of the keys above.`);
}

/** Confirms credentials work before the agent relies on them mid-pipeline. */
async function verify() {
  if (!IS_LIVE) {
    console.log('Mode: DRY-RUN');
    console.log('Missing:');
    for (const [key, value] of Object.entries({
      JIRA_BASE_URL: CONFIG.baseUrl,
      JIRA_EMAIL: CONFIG.email,
      JIRA_API_TOKEN: CONFIG.token,
      JIRA_PROJECT_KEY: CONFIG.projectKey,
    })) {
      if (!value) console.log(`  - ${key}`);
    }
    console.log('\nAdd them to .env to switch to live mode.');
    return;
  }

  const me = await jiraFetch('/rest/api/3/myself');
  console.log('Mode: LIVE');
  console.log(`Authenticated as: ${me.displayName} <${me.emailAddress}>`);

  const project = await jiraFetch(`/rest/api/3/project/${CONFIG.projectKey}`);
  console.log(`Project: ${project.key} — ${project.name}`);

  const types = (project.issueTypes ?? []).map((t) => t.name);
  console.log(`Issue types: ${types.join(', ')}`);
  if (types.length && !types.includes(CONFIG.issueType)) {
    console.log(
      `\nWARNING: JIRA_ISSUE_TYPE="${CONFIG.issueType}" is not in that list.` +
        ` Set JIRA_ISSUE_TYPE to one of them or create will fail.`,
    );
  }
}

function requireSlug(opts) {
  if (!opts.slug || opts.slug === true) throw new Error('--slug is required');
  return opts.slug;
}

function readSpec(slug, opts) {
  if (!opts.spec || opts.spec === true) throw new Error('--spec is required');

  const path = join(pipelineDir(slug), opts.spec);
  if (!existsSync(path)) throw new Error(`Spec not found: ${path}`);

  return readFileSync(path, 'utf8');
}

/** Jira descriptions get a header linking back to the prototype and spec file. */
function buildDescription(spec, state) {
  const header = [
    `Managed by the Beep PM agent. Source of truth: pipeline/${state.slug}/`,
    state.artifactUrl ? `Prototype (v${state.prototypeVersion}): ${state.artifactUrl}` : null,
    `Spec version: v${state.specVersion ?? 1}`,
    '',
    '---',
    '',
  ]
    .filter(Boolean)
    .join('\n');

  return header + spec;
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

const COMMANDS = { create, update, comment, verify, projects };

async function main() {
  const opts = args();
  const command = opts._[0];

  if (!command || !COMMANDS[command]) {
    console.error(
      `Usage: node tools/jira.mjs <create|update|comment|verify|projects> [options]`,
    );
    process.exit(1);
  }

  await COMMANDS[command](opts);
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
