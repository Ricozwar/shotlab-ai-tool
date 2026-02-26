#!/usr/bin/env node
/**
 * Tworzy issue'y w Linear na podstawie scripts/linear-issues.json.
 * Wymaga: LINEAR_API_KEY (Personal API Key z Linear → Settings → API).
 * Opcjonalnie: LINEAR_TEAM_KEY (np. SHOTLAB) – jeśli nie podany, szukamy teamu z "Shotlab" w nazwie lub używamy pierwszego.
 * Opcjonalnie: LINEAR_PROJECT_ID – ID projektu, do którego przypisać issue'y (wtedy każdy issue trafi do tego projektu).
 *
 * Uruchomienie (z katalogu SHOTLAB_AI_TOOL lub repo root):
 *   LINEAR_API_KEY=lin_api_xxx node scripts/linear-create-issues.mjs
 *   LINEAR_API_KEY=lin_api_xxx LINEAR_TEAM_KEY=SHOTLAB node scripts/linear-create-issues.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const API_URL = 'https://api.linear.app/graphql';

const apiKey = process.env.LINEAR_API_KEY;
if (!apiKey) {
  console.error('Brak LINEAR_API_KEY. Ustaw zmienną środowiskową (np. w Linear: Settings → API → Personal API keys).');
  process.exit(1);
}

const teamKey = process.env.LINEAR_TEAM_KEY || null;
const projectId = process.env.LINEAR_PROJECT_ID || null;

function graphql(query, variables = {}) {
  return fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  }).then((r) => r.json());
}

async function getTeams() {
  const res = await graphql(`
    query Teams {
      teams {
        nodes {
          id
          name
          key
        }
      }
    }
  `);
  if (res.errors) {
    console.error('Błąd API (teams):', res.errors);
    throw new Error(res.errors[0]?.message || 'getTeams failed');
  }
  return res.data.teams.nodes;
}

async function getProjects(teamId) {
  const res = await graphql(
    `
    query Projects($teamId: String!) {
      team(id: $teamId) {
        id
        name
        projects {
          nodes {
            id
            name
          }
        }
      }
    }
  `,
    { teamId }
  );
  if (res.errors) {
    console.error('Błąd API (projects):', res.errors);
    return [];
  }
  return res.data.team?.projects?.nodes || [];
}

async function createIssue(input) {
  const res = await graphql(
    `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          url
          title
        }
      }
    }
  `,
    { input }
  );
  if (res.errors) {
    console.error('Błąd API (issueCreate):', res.errors);
    throw new Error(res.errors[0]?.message || 'issueCreate failed');
  }
  const payload = res.data?.issueCreate;
  if (!payload?.success) {
    throw new Error('issueCreate returned success: false');
  }
  return payload.issue;
}

function loadIssues() {
  const path = join(__dirname, 'linear-issues.json');
  const raw = readFileSync(path, 'utf8');
  return JSON.parse(raw);
}

async function main() {
  const issues = loadIssues();
  console.log(`Wczytano ${issues.length} issue(ów) z linear-issues.json.\n`);

  const teams = await getTeams();
  if (!teams.length) {
    console.error('Brak teamów w workspace. Sprawdź API key i uprawnienia.');
    process.exit(1);
  }

  let team = teams.find((t) => teamKey && t.key === teamKey) || teams.find((t) => t.name.toLowerCase().includes('shotlab'));
  if (!team) team = teams[0];
  console.log(`Używany zespół: ${team.name} (${team.key}), id: ${team.id}`);

  let resolvedProjectId = projectId;
  if (!resolvedProjectId) {
    const projects = await getProjects(team.id);
    const shotlabProject = projects.find((p) => p.name.toLowerCase().includes('shotlab'));
    if (shotlabProject) {
      resolvedProjectId = shotlabProject.id;
      console.log(`Znaleziono projekt: ${shotlabProject.name}, id: ${shotlabProject.id}`);
    }
  } else {
    console.log(`Używany projekt (z env): ${resolvedProjectId}`);
  }

  const created = [];
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i];
    const input = {
      teamId: team.id,
      title: issue.title,
      description: issue.description || null,
      ...(resolvedProjectId && { projectId: resolvedProjectId }),
    };
    try {
      const createdIssue = await createIssue(input);
      created.push(createdIssue);
      console.log(`[${i + 1}/${issues.length}] ${createdIssue.identifier}: ${createdIssue.title}`);
    } catch (e) {
      console.error(`[${i + 1}/${issues.length}] Błąd: ${issue.title}`, e.message);
    }
  }

  console.log(`\nUtworzono ${created.length}/${issues.length} issue(ów).`);
  if (created.length) {
    console.log('\nLinki do issue\'ów:');
    created.forEach((i) => console.log(`  ${i.identifier}: ${i.url}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
