#!/usr/bin/env node

/**
 * Documentation Sanitizer
 * 
 * This script sanitizes documentation files by replacing real email addresses,
 * credentials, and other sensitive information with placeholders.
 * 
 * Usage: node scripts/sanitize-docs.js
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
  cyan: '\x1b[36m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

// Sensitive patterns to replace
const SANITIZATION_RULES = [
  // Email addresses
  {
    pattern: /abeljoshua04@gmail\.com/g,
    replacement: 'user@example.com',
    description: 'Personal Gmail address'
  },
  {
    pattern: /mzimahomes\.manager@gmail\.com/g,
    replacement: 'manager@example.com',
    description: 'Manager Gmail address'
  },
  {
    pattern: /mzimagas@gmail\.com/g,
    replacement: 'admin@example.com',
    description: 'Admin Gmail address'
  },
  {
    pattern: /mzimahomes@gmail\.com/g,
    replacement: 'system@example.com',
    description: 'System Gmail address'
  },
  {
    pattern: /landlord@mzimahomes\.com/g,
    replacement: 'landlord@example.com',
    description: 'Landlord email'
  },
  {
    pattern: /admin@mzimahomes\.com/g,
    replacement: 'admin@example.com',
    description: 'Admin email in migrations'
  },
  
  // Passwords
  {
    pattern: /MzimaHomes2024!/g,
    replacement: 'SecurePassword123!',
    description: 'Hardcoded password'
  },
  {
    pattern: /MzimaHomes2024!Secure/g,
    replacement: 'SecurePassword123!',
    description: 'Hardcoded secure password'
  },
  {
    pattern: /password123/g,
    replacement: 'userPassword123',
    description: 'Test password'
  },
  
  // User IDs and sensitive identifiers
  {
    pattern: /7ef41199-9161-4dea-8c90-0511ee310b3a/g,
    replacement: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    description: 'User ID'
  },
  {
    pattern: /16d2d9e9-accb-4a79-bb74-52a734169f12/g,
    replacement: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    description: 'User ID'
  },
  
  // App passwords and tokens (partial patterns for safety)
  {
    pattern: /nauo vchp drwl ejjc/g,
    replacement: 'xxxx xxxx xxxx xxxx',
    description: 'Gmail app password'
  }
]

// Files to sanitize (documentation files only)
const DOCUMENTATION_EXTENSIONS = ['.md', '.txt']

// Directories to exclude
const EXCLUDE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build']

function shouldSanitizeFile(filePath) {
  // Only sanitize documentation files
  const ext = path.extname(filePath)
  if (!DOCUMENTATION_EXTENSIONS.includes(ext)) {
    return false
  }
  
  // Skip already sanitized files
  if (filePath.includes('SECURITY_CLEANUP_REPORT.md') || 
      filePath.includes('sanitize-docs.js')) {
    return false
  }
  
  // Check if file is in excluded directory
  for (const exclude of EXCLUDE_DIRS) {
    if (filePath.includes(exclude)) {
      return false
    }
  }
  
  return true
}

function sanitizeFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    let modified = false
    const appliedRules = []
    
    // Apply each sanitization rule
    SANITIZATION_RULES.forEach(rule => {
      const originalContent = content
      content = content.replace(rule.pattern, rule.replacement)
      
      if (content !== originalContent) {
        modified = true
        appliedRules.push(rule.description)
      }
    })
    
    // Write back if modified
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8')
      log(`✅ Sanitized: ${filePath}`, 'green')
      appliedRules.forEach(rule => {
        log(`   - ${rule}`, 'blue')
      })
      return true
    }
    
    return false
  } catch (error) {
    log(`❌ Error sanitizing ${filePath}: ${error.message}`, 'red')
    return false
  }
}

function sanitizeDirectory(dirPath) {
  let sanitizedCount = 0
  
  try {
    const items = fs.readdirSync(dirPath)
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item)
      const stat = fs.statSync(itemPath)
      
      if (stat.isDirectory()) {
        if (!EXCLUDE_DIRS.includes(item)) {
          sanitizedCount += sanitizeDirectory(itemPath)
        }
      } else if (stat.isFile() && shouldSanitizeFile(itemPath)) {
        if (sanitizeFile(itemPath)) {
          sanitizedCount++
        }
      }
    }
  } catch (error) {
    log(`❌ Error scanning directory ${dirPath}: ${error.message}`, 'red')
  }
  
  return sanitizedCount
}

function main() {
  log('\n🧹 Starting documentation sanitization...', 'cyan')
  log('Sanitizing sensitive information in documentation files', 'blue')
  
  const sanitizedCount = sanitizeDirectory('.')
  
  log('\n📊 SANITIZATION SUMMARY:', 'cyan')
  log(`   Files sanitized: ${sanitizedCount}`, sanitizedCount > 0 ? 'green' : 'blue')
  
  if (sanitizedCount > 0) {
    log('\n✅ Documentation sanitization completed successfully', 'green')
    log('All sensitive information has been replaced with placeholders', 'green')
  } else {
    log('\n✅ No files required sanitization', 'green')
    log('Documentation appears to be already clean', 'green')
  }
  
  log('\n🔧 NEXT STEPS:', 'cyan')
  log('   1. Review the sanitized files to ensure accuracy', 'reset')
  log('   2. Run security scan again to verify cleanup', 'reset')
  log('   3. Update any references to use environment variables', 'reset')
  log('   4. Commit the sanitized documentation', 'reset')
}

// Run the sanitization
main()
