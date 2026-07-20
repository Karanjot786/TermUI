#!/usr/bin/env node
// ─────────────────────────────────────────────────────
// generate-contributors — Fetch contributors and update CONTRIBUTORS.md
// ─────────────────────────────────────────────────────

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

let repo = process.env.GITHUB_REPOSITORY;

if (!repo) {
  try {
    const remoteUrl = execSync('git config --get remote.upstream.url', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/github\.com[/:]([^/]+\/[^/.]+)/);
    if (match) {
      repo = match[1];
    }
  } catch (e) {
    // Ignore error
  }
}

if (!repo) {
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
    const match = remoteUrl.match(/github\.com[/:]([^/]+\/[^/.]+)/);
    if (match) {
      repo = match[1];
    }
  } catch (e) {
    // Ignore error
  }
}

if (!repo) {
  repo = 'Karanjot786/TermUI';
}

console.log(`Fetching contributors for repository: ${repo}...`);

const headers = {
  'User-Agent': 'TermUI-Contributors-Bot',
  'Accept': 'application/vnd.github+json',
};

if (process.env.GITHUB_TOKEN) {
  headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
}

let contributors = [];
let page = 1;
let useToken = !!process.env.GITHUB_TOKEN;

try {
  while (true) {
    const activeHeaders = { ...headers };
    if (!useToken) {
      delete activeHeaders['Authorization'];
    }

    let response = await fetch(`https://api.github.com/repos/${repo}/contributors?per_page=100&page=${page}`, { headers: activeHeaders });
    
    // If the token is invalid (401) or has another auth error, retry without it once
    if (!response.ok && response.status === 401 && useToken) {
      console.warn('⚠️ GITHUB_TOKEN was unauthorized. Retrying request without authorization...');
      useToken = false;
      delete activeHeaders['Authorization'];
      response = await fetch(`https://api.github.com/repos/${repo}/contributors?per_page=100&page=${page}`, { headers: activeHeaders });
    }

    if (!response.ok) {
      throw new Error(`GitHub API returned status ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid response format: expected an array');
    }
    if (data.length === 0) {
      break;
    }
    contributors.push(...data);
    if (data.length < 100) {
      break;
    }
    page++;
  }

  // Filter for real users (exclude bots)
  const users = contributors.filter((c) => c.type === 'User');

  console.log(`Found ${users.length} contributors.`);

  // Generate markdown content
  let markdown = `# Contributors\n\n`;
  markdown += `We want to thank all the amazing contributors who have helped make TermUI what it is! Here is the list of people who have contributed to the project:\n\n`;
  markdown += `| Avatar | Contributor | Contributions |\n`;
  markdown += `| :---: | :--- | :---: |\n`;

  for (const user of users) {
    const avatar = `<img src="${user.avatar_url}" width="40" height="40" style="border-radius: 50%;" alt="${user.login}" />`;
    const username = `[@${user.login}](${user.html_url})`;
    const count = user.contributions;
    markdown += `| ${avatar} | ${username} | ${count} |\n`;
  }

  const outputPath = resolve('CONTRIBUTORS.md');
  writeFileSync(outputPath, markdown, 'utf8');
  console.log(`✓ Contributors list successfully written to ${outputPath}`);
} catch (error) {
  console.error(`✗ Error generating contributors:`, error.message);
  process.exit(1);
}
