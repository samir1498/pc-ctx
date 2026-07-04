import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parsePlanFile, writePlanFileAtomic } from './index.js';

/**
 * Backfill completed_at on existing done/cancelled plans by walking git log
 * on the plans directory. Finds the commit where status flipped to done/cancelled
 * and writes that commit date as completed_at.
 *
 * Idempotent: skips plans that already have completed_at set.
 */
export function backfillCompletedAt(plansDir: string, rootDir: string): {
  backfilled: number;
  skipped: number;
  errors: string[];
} {
  if (!existsSync(plansDir)) {
    return { backfilled: 0, skipped: 0, errors: ['plans directory not found'] };
  }

  const errors: string[] = [];
  let backfilled = 0;
  let skipped = 0;

  function collectFiles(dir: string): string[] {
    const files: string[] = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...collectFiles(full));
      } else if (entry.name.endsWith('.md')) {
        files.push(full);
      }
    }
    return files;
  }

  const files = collectFiles(plansDir);

  for (const filepath of files) {
    const plan = parsePlanFile(filepath);
    if (!plan) continue;

    const f = plan.frontmatter;
    const status = f.status as string | undefined;
    if (status !== 'done' && status !== 'cancelled') {
      skipped++;
      continue;
    }

    if (f.completed_at) {
      skipped++;
      continue;
    }

    const slug = (f.slug || plan.slug) as string;
    const relPath = filepath;

    try {
      const log = execSync(`git log --all -1 --format="%ad" --date=short -p -- "${relPath}"`, {
        cwd: rootDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const lines = log.split('\n');
      let commitDate: string | null = null;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] ?? '';
        if (line.startsWith('+status:') || line.startsWith('+ status:')) {
          const val = line.replace(/^\+ ?status:\s*/, '').trim();
          if (val === 'done' || val === 'cancelled') {
            for (let j = i - 1; j >= 0; j--) {
              const prev = lines[j] ?? '';
              if (prev.match(/^\d{4}-\d{2}-\d{2}$/)) {
                commitDate = prev.trim();
                break;
              }
            }
            break;
          }
        }
      }

      if (!commitDate) {
        commitDate = statSync(filepath).mtime.toISOString().slice(0, 10);
      }

      plan.frontmatter.completed_at = commitDate;
      writePlanFileAtomic(plan);
      backfilled++;
    } catch {
      try {
        const mtime = statSync(filepath).mtime.toISOString().slice(0, 10);
        plan.frontmatter.completed_at = mtime;
        writePlanFileAtomic(plan);
        backfilled++;
      } catch (e) {
        errors.push(`${slug}: ${String(e)}`);
      }
    }
  }

  return { backfilled, skipped, errors };
}