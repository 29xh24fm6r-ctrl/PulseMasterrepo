#!/usr/bin/env node

/**
 * Audit script to find database queries missing owner_user_id filter
 * Scans app/api/**/route.ts files for unfiltered Supabase queries
 */

import * as fs from 'fs';
import * as path from 'path';
import { glob } from 'glob';

interface AuditResult {
  file: string;
  line: number;
  issue: string;
  severity: 'high' | 'medium' | 'low';
}

const USER_OWNED_TABLES = [
  'crm_contacts',
  'crm_deals',
  'crm_organizations',
  'crm_interactions',
  'crm_tasks',
  'crm_alerts',
  'email_',
  'calendar_',
  'contacts',
  'deals',
  'tasks',
  'notes',
  'memories',
  'tb_',
  'knowledge_nodes',
  'knowledge_edges',
  'emo_',
  'user_profiles',
  'habits',
  'goals',
];

const GLOBAL_TABLES = [
  'job_titles',
  'job_categories',
  'industries',
  'voice_profiles', // might be global reference
];

function isUserOwnedTable(tableName: string): boolean {
  return USER_OWNED_TABLES.some(pattern => tableName.includes(pattern));
}

function hasOwnerFilter(code: string, lineIndex: number): boolean {
  // Look for .eq('owner_user_id' or .eq("owner_user_id" in nearby lines
  const lines = code.split('\n');
  const start = Math.max(0, lineIndex - 5);
  const end = Math.min(lines.length, lineIndex + 10);
  const context = lines.slice(start, end).join('\n');
  
  return /\.eq\(['"]owner_user_id['"]/.test(context);
}

function auditFile(filePath: string): AuditResult[] {
  const results: AuditResult[] = [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for .from() calls
    const fromMatch = line.match(/\.from\(['"]([^'"]+)['"]\)/);
    if (fromMatch) {
      const tableName = fromMatch[1];
      
      if (isUserOwnedTable(tableName)) {
        // Check if this is in a query chain
        if (line.includes('.select(') || line.includes('.insert(') || 
            line.includes('.update(') || line.includes('.delete(') ||
            line.includes('.upsert(')) {
          
          // Look ahead for owner filter
          if (!hasOwnerFilter(content, index)) {
            // Check if it's using requireClerkUserId or similar
            const hasAuth = content.includes('requireClerkUserId') || 
                           content.includes('auth()') ||
                           content.includes('userId');
            
            results.push({
              file: filePath,
              line: lineNum,
              issue: `Query on user-owned table "${tableName}" missing owner_user_id filter`,
              severity: hasAuth ? 'high' : 'critical',
            });
          }
        }
      }
    }
    
    // Check for direct SQL or raw queries (high risk)
    if (line.match(/\.rpc\(|\.execute\(|raw\(|sql\(/i)) {
      if (!line.includes('owner_user_id')) {
        results.push({
          file: filePath,
          line: lineNum,
          issue: 'Raw SQL/RPC call detected - verify owner_user_id filtering',
          severity: 'high',
        });
      }
    }
  });

  return results;
}

async function main() {
  console.log('🔍 Auditing API routes for missing owner_user_id filters...\n');
  
  const apiRoutes = await glob('app/api/**/route.ts', {
    ignore: ['**/node_modules/**'],
  });
  
  const allResults: AuditResult[] = [];
  
  for (const file of apiRoutes) {
    const results = auditFile(file);
    allResults.push(...results);
  }
  
  // Group by severity
  const critical = allResults.filter(r => r.severity === 'critical');
  const high = allResults.filter(r => r.severity === 'high');
  const medium = allResults.filter(r => r.severity === 'medium');
  
  console.log(`📊 Audit Results:\n`);
  console.log(`   Critical: ${critical.length}`);
  console.log(`   High:     ${high.length}`);
  console.log(`   Medium:   ${medium.length}`);
  console.log(`   Total:    ${allResults.length}\n`);
  
  if (allResults.length === 0) {
    console.log('✅ No issues found! All queries appear to be tenant-safe.\n');
    process.exit(0);
  }
  
  // Print results grouped by file
  const byFile = new Map<string, AuditResult[]>();
  allResults.forEach(r => {
    const existing = byFile.get(r.file) || [];
    existing.push(r);
    byFile.set(r.file, existing);
  });
  
  console.log('🚨 Issues Found:\n');
  
  byFile.forEach((results, file) => {
    console.log(`\n📄 ${file}`);
    results.forEach(r => {
      const icon = r.severity === 'critical' ? '🔴' : r.severity === 'high' ? '🟠' : '🟡';
      console.log(`   ${icon} Line ${r.line}: ${r.issue}`);
    });
  });
  
  console.log('\n');
  console.log('⚠️  Note: This is a pattern-based audit. Review manually to confirm.');
  console.log('   Some queries may be safe if owner filtering happens in library functions.\n');
  
  process.exit(allResults.length > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('❌ Audit failed:', err);
  process.exit(1);
});

