#!/usr/bin/env node

/**
 * Automatic Changelog Generator
 *
 * This script generates changelog entries based on conventional commit messages.
 * Commit message format: <type>: <description>
 *
 * Types:
 * - feat: A new feature
 * - fix: A bug fix
 * - chore: Maintenance tasks
 * - docs: Documentation only changes
 * - style: Code style changes (formatting, etc.)
 * - refactor: Code refactoring
 * - test: Adding or updating tests
 * - perf: Performance improvements
 *
 * Usage:
 *   node scripts/generate-changelog.js [options]
 *
 * Options:
 *   --since <tag>     Generate changelog since specific tag (default: last tag)
 *   --to <tag>        Generate changelog up to specific tag (default: HEAD)
 *   --output <file>   Output file (default: CHANGELOG.md)
 *   --dry-run         Print to console without writing to file
 */

const { execFileSync } = require("child_process")
const fs = require("fs")
const path = require("path")

// Configuration
const COMMIT_TYPES = {
  feat: { title: "### Added", priority: 1 },
  fix: { title: "### Fixed", priority: 2 },
  perf: { title: "### Performance", priority: 3 },
  refactor: { title: "### Changed", priority: 4 },
  test: { title: "### Testing", priority: 5 },
  docs: { title: "### Documentation", priority: 6 },
  chore: { title: "### Maintenance", priority: 7 },
  style: { title: "### Style", priority: 8 },
}

const IGNORED_COMMIT_PATTERNS = [
  /^Merge branch/,
  /^Merge pull request/,
  /^Revert/,
  /^WIP:/,
  /^ci:/,
  /^build:/,
]

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const options = {
    since: null,
    to: "HEAD",
    output: "CHANGELOG.md",
    dryRun: false,
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--since":
        if (!args[i + 1] || args[i + 1].startsWith("-")) {
          console.error("Error: --since requires a tag argument")
          printHelp()
          process.exit(1)
        }
        options.since = args[++i]
        break
      case "--to":
        if (!args[i + 1] || args[i + 1].startsWith("-")) {
          console.error("Error: --to requires a tag argument")
          printHelp()
          process.exit(1)
        }
        options.to = args[++i]
        break
      case "--output":
        if (!args[i + 1] || args[i + 1].startsWith("-")) {
          console.error("Error: --output requires a file argument")
          printHelp()
          process.exit(1)
        }
        options.output = args[++i]
        break
      case "--dry-run":
        options.dryRun = true
        break
      case "--help":
      case "-h":
        printHelp()
        process.exit(0)
        break
    }
  }

  return options
}

function printHelp() {
  console.log(`
Automatic Changelog Generator

Usage: node scripts/generate-changelog.js [options]

Options:
  --since <tag>     Generate changelog since specific tag (default: last tag)
  --to <tag>        Generate changelog up to specific tag (default: HEAD)
  --output <file>   Output file (default: CHANGELOG.md)
  --dry-run         Print to console without writing to file
  --help, -h        Show this help message

Examples:
  node scripts/generate-changelog.js
  node scripts/generate-changelog.js --since v1.0.0 --to v1.1.0
  node scripts/generate-changelog.js --dry-run
`)
}

// Get the last tag
function getLastTag() {
  try {
    return execFileSync("git", ["describe", "--tags", "--abbrev=0"], {
      encoding: "utf-8",
      stdio: ["inherit", "pipe", "pipe"],
    }).trim()
  } catch {
    return null
  }
}

// Get commits between two references
function getCommits(since, to) {
  const range = since ? `${since}..${to}` : to
  // Use non-printable separators: %x1F (field separator) and %x1E (record separator)
  const format = "%H%x1F%s%x1F%b%x1F%an%x1F%ad%x1E"

  try {
    const output = execFileSync(
      "git",
      ["log", range, "--pretty=format:" + format, "--no-merges"],
      { encoding: "utf-8", stdio: ["inherit", "pipe", "pipe"] },
    )

    if (!output.trim()) {
      return []
    }

    return output
      .split("\x1E")
      .filter(record => record.trim() !== "")
      .map(record => {
        const [hash, subject, body, author, date] = record.split("\x1F")
        return { hash, subject, body, author, date }
      })
  } catch (error) {
    console.error("Error fetching commits:", error.message)
    return []
  }
}

// Parse commit message
function parseCommit(commit) {
  const match = commit.subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/)

  if (!match) {
    return null
  }

  const [, type, scope, breakingMarker, description] = match

  // Check if type is recognized (type is captured without the '!' marker)
  if (!COMMIT_TYPES[type]) {
    return null
  }

  // Check if commit should be ignored
  for (const pattern of IGNORED_COMMIT_PATTERNS) {
    if (pattern.test(commit.subject)) {
      return null
    }
  }

  // Check for BREAKING CHANGE: footer in the commit body
  let breakingChanges = null
  if (commit.body) {
    const breakingMatch = commit.body.match(/BREAKING CHANGE:\s*(.+)/i)
    if (breakingMatch) {
      breakingChanges = breakingMatch[1].trim()
    }
  }

  return {
    type,
    scope,
    description,
    hash: commit.hash.slice(0, 7),
    author: commit.author,
    date: commit.date,
    breaking: !!breakingMarker || !!breakingChanges, // Track if this is a breaking change
    breakingChanges, // Store the breaking change description if present
  }
}

// Group commits by type
function groupCommits(commits) {
  const groups = {}

  for (const commit of commits) {
    const parsed = parseCommit(commit)
    if (!parsed) continue

    if (!groups[parsed.type]) {
      groups[parsed.type] = []
    }

    groups[parsed.type].push(parsed)
  }

  return groups
}

// Generate changelog entry
function generateChangelogEntry(groups, since, to) {
  const date = new Date().toISOString().split("T")[0]
  const version = to === "HEAD" ? "[Unreleased]" : to

  let entry = `## ${version} - ${date}\n\n`

  // Sort types by priority
  const sortedTypes = Object.keys(groups).sort((a, b) => {
    return COMMIT_TYPES[a].priority - COMMIT_TYPES[b].priority
  })

  for (const type of sortedTypes) {
    const commits = groups[type]
    const { title } = COMMIT_TYPES[type]

    entry += `${title}\n`

    for (const commit of commits) {
      const scope = commit.scope ? `**${commit.scope}:** ` : ""
      const breakingMarker = commit.breaking ? " **[BREAKING]**" : ""
      entry += `- ${scope}${commit.description}${breakingMarker} (${commit.hash})\n`

      // Add breaking change description on the next line if present
      if (commit.breakingChanges) {
        entry += `  - ${commit.breakingChanges}\n`
      }
    }

    entry += "\n"
  }

  return entry
}

// Update CHANGELOG.md file
function updateChangelogFile(entry, outputPath, dryRun) {
  const changelogPath = path.resolve(outputPath)

  if (dryRun) {
    console.log("=== Generated Changelog Entry ===\n")
    console.log(entry)
    return
  }

  let content = ""

  if (fs.existsSync(changelogPath)) {
    content = fs.readFileSync(changelogPath, "utf-8")

    // Find the position after the header
    const headerMatch = content.match(/^(# Changelog[\s\S]*?)(## |$)/)
    if (headerMatch) {
      const headerEnd = headerMatch[1].length
      content =
        content.slice(0, headerEnd) + "\n" + entry + content.slice(headerEnd)
    } else {
      content = "# Changelog\n\n" + entry + content
    }
  } else {
    content = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

${entry}`
  }

  fs.writeFileSync(changelogPath, content)
  console.log(`✅ Changelog updated: ${outputPath}`)
}

// Main function
function main() {
  const options = parseArgs()

  // Determine range
  const since = options.since || getLastTag()
  const to = options.to

  console.log(`Generating changelog from ${since || "beginning"} to ${to}...\n`)

  // Get commits
  const commits = getCommits(since, to)

  if (commits.length === 0) {
    console.log("No commits found in the specified range.")
    return
  }

  console.log(`Found ${commits.length} commits\n`)

  // Group and generate
  const groups = groupCommits(commits)
  const entry = generateChangelogEntry(groups, since, to)

  // Update file
  updateChangelogFile(entry, options.output, options.dryRun)
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = { generateChangelogEntry, parseCommit, groupCommits }
