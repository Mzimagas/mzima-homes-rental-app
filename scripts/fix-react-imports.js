#!/usr/bin/env node

/**
 * Fix React wildcard imports for better tree shaking
 */

const fs = require('fs')
const path = require('path')

class ReactImportFixer {
  constructor() {
    this.srcDir = path.join(__dirname, '../src')
    this.fixedFiles = []
    this.errors = []
  }

  async fix() {
    console.log('🔧 Fixing React wildcard imports...\n')
    
    await this.processDirectory(this.srcDir)
    
    console.log(`✅ Fixed ${this.fixedFiles.length} files`)
    if (this.errors.length > 0) {
      console.log(`❌ Errors in ${this.errors.length} files:`)
      this.errors.forEach(error => console.log(`   ${error}`))
    }
    
    return {
      fixed: this.fixedFiles.length,
      errors: this.errors.length
    }
  }

  async processDirectory(dir) {
    const files = fs.readdirSync(dir, { withFileTypes: true })
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name)
      
      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        await this.processDirectory(fullPath)
      } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
        await this.fixFile(fullPath)
      }
    }
  }

  async fixFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const relativePath = path.relative(this.srcDir, filePath)
      
      // Check for React wildcard import
      const reactWildcardPattern = /import\s+\*\s+as\s+React\s+from\s+['"]react['"]/g
      
      if (reactWildcardPattern.test(content)) {
        const fixedContent = content.replace(
          /import\s+\*\s+as\s+React\s+from\s+['"]react['"]/g,
          "import React from 'react'"
        )
        
        fs.writeFileSync(filePath, fixedContent, 'utf8')
        this.fixedFiles.push(relativePath)
        console.log(`✅ Fixed: ${relativePath}`)
      }
      
    } catch (error) {
      this.errors.push(`${filePath}: ${error.message}`)
    }
  }
}

// CLI execution
if (require.main === module) {
  const fixer = new ReactImportFixer()
  fixer.fix().then(results => {
    process.exit(results.errors > 0 ? 1 : 0)
  }).catch(error => {
    console.error('Error during fixing:', error)
    process.exit(1)
  })
}

module.exports = ReactImportFixer
