#!/usr/bin/env node

/**
 * Security Scanner for Hardcoded Credentials
 *
 * This script scans the codebase for potential hardcoded credentials,
 * API keys, passwords, and other sensitive information.
 *
 * Usage: node scripts/security-scan.js
 */

const fs = require('fs')
const path = require('path')

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Patterns to search for potential secrets
const SECURITY_PATTERNS = [
  // API Keys and Tokens
  {
    pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
    type: 'JWT Token',
    severity: 'HIGH',
  },
  { pattern: /sk_[a-zA-Z0-9]{24,}/, type: 'Stripe Secret Key', severity: 'HIGH' },
  { pattern: /pk_[a-zA-Z0-9]{24,}/, type: 'Stripe Public Key', severity: 'MEDIUM' },
  { pattern: /AIza[0-9A-Za-z_-]{35}/, type: 'Google API Key', severity: 'HIGH' },
  { pattern: /AKIA[0-9A-Z]{16}/, type: 'AWS Access Key', severity: 'HIGH' },

  // Database URLs and Connection Strings
  {
    pattern: /postgres:\/\/[^:\s]+:[^@\s]+@[^:\s]+:\d+\/\w+/,
    type: 'PostgreSQL Connection String',
    severity: 'HIGH',
  },
  {
    pattern: /mongodb:\/\/[^:\s]+:[^@\s]+@[^:\s]+:\d+\/\w+/,
    type: 'MongoDB Connection String',
    severity: 'HIGH',
  },

  // Email Patterns (potential personal info)
  { pattern: /[a-zA-Z0-9._%+-]+@gmail\.com/, type: 'Gmail Address', severity: 'MEDIUM' },
  { pattern: /[a-zA-Z0-9._%+-]+@mzimahomes\.com/, type: 'Company Email', severity: 'MEDIUM' },

  // Password-like patterns
  { pattern: /password\s*[:=]\s*["'][^"']{8,}["']/, type: 'Hardcoded Password', severity: 'HIGH' },
  { pattern: /pass\s*[:=]\s*["'][^"']{8,}["']/, type: 'Hardcoded Password', severity: 'HIGH' },
  { pattern: /secret\s*[:=]\s*["'][^"']{8,}["']/, type: 'Hardcoded Secret', severity: 'HIGH' },

  // Phone numbers and IDs
  { pattern: /\b\d{10,15}\b/, type: 'Phone Number', severity: 'LOW' },
  {
    pattern: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i,
    type: 'UUID',
    severity: 'LOW',
  },

  // M-Pesa and Payment Credentials
  { pattern: /\b\d{6}\b/, type: 'Potential M-Pesa Shortcode', severity: 'MEDIUM' },
  { pattern: /consumer[_-]?key/i, type: 'Consumer Key Reference', severity: 'MEDIUM' },
  { pattern: /consumer[_-]?secret/i, type: 'Consumer Secret Reference', severity: 'MEDIUM' },
]

// Files and directories to exclude from scanning
const EXCLUDE_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'coverage',
  '.env.example',
  '.env.production.template',
  'package-lock.json',
  'yarn.lock',
  'SECURITY_CLEANUP_REPORT.md',
  'security-scan.js',
]

// File extensions to scan
const SCAN_EXTENSIONS = [
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.json',
  '.md',
  '.txt',
  '.sql',
  '.env',
  '.env.local',
  '.env.production',
  '.toml',
  '.yaml',
  '.yml',
]

function shouldScanFile(filePath) {
  // Check if file should be excluded
  for (const exclude of EXCLUDE_PATTERNS) {
    if (filePath.includes(exclude)) {
      return false
    }
  }

  // Check if file extension should be scanned
  const ext = path.extname(filePath)
  return SCAN_EXTENSIONS.includes(ext) || path.basename(filePath).startsWith('.env')
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const lines = content.split('\n')
    const findings = []

    lines.forEach((line, lineNumber) => {
      SECURITY_PATTERNS.forEach(({ pattern, type, severity }) => {
        const matches = line.match(pattern)
        if (matches) {
          // Skip if it's clearly a placeholder or example
          const lowerLine = line.toLowerCase()
          if (
            lowerLine.includes('your-') ||
            lowerLine.includes('example') ||
            lowerLine.includes('placeholder') ||
            lowerLine.includes('test-') ||
            lowerLine.includes('[removed for security]') ||
            lowerLine.includes('env(your_') ||
            line.includes('# password =') ||
            line.includes('client_secret =')
          ) {
            return
          }

          findings.push({
            file: filePath,
            line: lineNumber + 1,
            content: line.trim(),
            match: matches[0],
            type,
            severity,
          })
        }
      })
    })

    return findings
  } catch (error) {
    log(`Error reading file ${filePath}: ${error.message}`, 'red')
    return []
  }
}

function scanDirectory(dirPath) {
  let allFindings = []

  try {
    const items = fs.readdirSync(dirPath)

    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)

      if (stat.isDirectory()) {
        if (!EXCLUDE_PATTERNS.some((exclude) => item.includes(exclude))) {
          allFindings = allFindings.concat(scanDirectory(itemPath))
        }
      } else if (stat.isFile() && shouldScanFile(itemPath)) {
        const findings = scanFile(itemPath)
        allFindings = allFindings.concat(findings)
      }
    }
  } catch (error) {
    log(`Error scanning directory ${dirPath}: ${error.message}`, 'red')
  }

  return allFindings
}

function generateReport(findings) {
  log('\n🔐 SECURITY SCAN REPORT', 'bold')
  log('='.repeat(60), 'blue')

  if (findings.length === 0) {
    log('\n✅ No potential security issues found!', 'green')
    log('The codebase appears to be clean of hardcoded credentials.', 'green')
    return
  }

  // Group findings by severity
  const bySeverity = {
    HIGH: findings.filter((f) => f.severity === 'HIGH'),
    MEDIUM: findings.filter((f) => f.severity === 'MEDIUM'),
    LOW: findings.filter((f) => f.severity === 'LOW'),
  }

  log(`\n📊 SUMMARY:`, 'cyan')
  log(`   Total findings: ${findings.length}`, 'reset')
  log(`   High severity: ${bySeverity.HIGH.length}`, bySeverity.HIGH.length > 0 ? 'red' : 'green')
  log(
    `   Medium severity: ${bySeverity.MEDIUM.length}`,
    bySeverity.MEDIUM.length > 0 ? 'yellow' : 'green'
  )
  log(`   Low severity: ${bySeverity.LOW.length}`, bySeverity.LOW.length > 0 ? 'blue' : 'green')

  // Report high severity issues first
  if (bySeverity.HIGH.length > 0) {
    log('\n🚨 HIGH SEVERITY ISSUES:', 'red')
    bySeverity.HIGH.forEach((finding, index) => {
      log(`\n${index + 1}. ${finding.type}`, 'red')
      log(`   File: ${finding.file}:${finding.line}`, 'reset')
      log(`   Content: ${finding.content}`, 'reset')
      log(`   Match: ${finding.match}`, 'yellow')
    })
  }

  // Report medium severity issues
  if (bySeverity.MEDIUM.length > 0) {
    log('\n⚠️  MEDIUM SEVERITY ISSUES:', 'yellow')
    bySeverity.MEDIUM.forEach((finding, index) => {
      log(`\n${index + 1}. ${finding.type}`, 'yellow')
      log(`   File: ${finding.file}:${finding.line}`, 'reset')
      log(`   Content: ${finding.content}`, 'reset')
    })
  }

  // Report low severity issues (summary only)
  if (bySeverity.LOW.length > 0) {
    log('\nℹ️  LOW SEVERITY ISSUES:', 'blue')
    const lowByType = {}
    bySeverity.LOW.forEach((finding) => {
      lowByType[finding.type] = (lowByType[finding.type] || 0) + 1
    })
    Object.entries(lowByType).forEach(([type, count]) => {
      log(`   ${type}: ${count} occurrences`, 'blue')
    })
  }

  // Recommendations
  log('\n💡 RECOMMENDATIONS:', 'cyan')

  if (bySeverity.HIGH.length > 0) {
    log('   🚨 IMMEDIATE ACTION REQUIRED:', 'red')
    log('   • Rotate all exposed credentials immediately', 'red')
    log('   • Move secrets to environment variables', 'red')
    log('   • Review git history for credential exposure', 'red')
  }

  if (bySeverity.MEDIUM.length > 0) {
    log('   ⚠️  REVIEW RECOMMENDED:', 'yellow')
    log('   • Verify these are not actual credentials', 'yellow')
    log('   • Replace with placeholders if needed', 'yellow')
    log('   • Consider using environment variables', 'yellow')
  }

  if (bySeverity.LOW.length > 0) {
    log('   ℹ️  INFORMATIONAL:', 'blue')
    log('   • Review for potential sensitive data', 'blue')
    log('   • Consider if these should be configurable', 'blue')
  }

  log('\n🔧 NEXT STEPS:', 'cyan')
  log('   1. Address high severity issues immediately', 'reset')
  log('   2. Review medium severity findings', 'reset')
  log('   3. Implement automated secret scanning in CI/CD', 'reset')
  log('   4. Set up pre-commit hooks to prevent future issues', 'reset')
}

function main() {
  log('\n🔍 Starting security scan for hardcoded credentials...', 'cyan')
  log('Scanning directory: ' + process.cwd(), 'blue')

  const findings = scanDirectory('.')
  generateReport(findings)

  // Exit with error code if high severity issues found
  const highSeverityCount = findings.filter((f) => f.severity === 'HIGH').length
  if (highSeverityCount > 0) {
    log(`\n❌ Security scan failed: ${highSeverityCount} high severity issues found`, 'red')
    process.exit(1)
  } else {
    log('\n✅ Security scan completed successfully', 'green')
    process.exit(0)
  }
}

// Run the security scan
main()
