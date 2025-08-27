#!/usr/bin/env node

/**
 * Quality Gate Script
 * Enforces code quality standards and fails CI if thresholds are not met
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
}

class QualityGate {
  constructor() {
    this.config = this.loadConfig()
    this.results = {
      coverage: null,
      complexity: null,
      duplication: null,
      security: null,
      overall: 'PASS'
    }
  }

  loadConfig() {
    try {
      const configPath = path.join(process.cwd(), '.qualitygate.json')
      return JSON.parse(fs.readFileSync(configPath, 'utf8'))
    } catch (error) {
      console.error(`${colors.red}Error loading quality gate config:${colors.reset}`, error.message)
      process.exit(1)
    }
  }

  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`)
  }

  async runCoverageGate() {
    if (!this.config.gates.coverage.enabled) {
      this.log('📊 Coverage gate: SKIPPED', 'yellow')
      return true
    }

    this.log('📊 Running coverage analysis...', 'blue')
    
    try {
      // Run tests with coverage
      execSync('npm run test:coverage', { stdio: 'inherit' })
      
      // Read coverage results
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json')
      if (!fs.existsSync(coveragePath)) {
        this.log('❌ Coverage report not found', 'red')
        return false
      }

      const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'))
      const total = coverage.total

      const thresholds = this.config.gates.coverage.thresholds.global
      const results = {
        lines: total.lines.pct >= thresholds.lines,
        functions: total.functions.pct >= thresholds.functions,
        branches: total.branches.pct >= thresholds.branches,
        statements: total.statements.pct >= thresholds.statements
      }

      this.results.coverage = {
        actual: total,
        thresholds,
        passed: Object.values(results).every(Boolean)
      }

      // Log results
      this.log('\n📊 Coverage Results:', 'cyan')
      Object.entries(results).forEach(([metric, passed]) => {
        const actual = total[metric].pct
        const threshold = thresholds[metric]
        const status = passed ? '✅' : '❌'
        const color = passed ? 'green' : 'red'
        this.log(`  ${status} ${metric}: ${actual}% (threshold: ${threshold}%)`, color)
      })

      if (this.results.coverage.passed) {
        this.log('\n✅ Coverage gate: PASSED', 'green')
        return true
      } else {
        this.log('\n❌ Coverage gate: FAILED', 'red')
        return !this.config.gates.coverage.failOnThreshold
      }
    } catch (error) {
      this.log(`❌ Coverage gate failed: ${error.message}`, 'red')
      return false
    }
  }

  async runComplexityGate() {
    if (!this.config.gates.complexity.enabled) {
      this.log('🧠 Complexity gate: SKIPPED', 'yellow')
      return true
    }

    this.log('🧠 Running complexity analysis...', 'blue')
    
    try {
      // Run ESLint with complexity rules
      const result = execSync('npm run lint:strict', { encoding: 'utf8', stdio: 'pipe' })
      
      this.log('✅ Complexity gate: PASSED', 'green')
      return true
    } catch (error) {
      // Parse ESLint output for complexity violations
      const output = error.stdout || error.stderr || ''
      const complexityViolations = output.match(/complexity|cognitive-complexity/gi) || []
      
      if (complexityViolations.length > 0) {
        this.log(`❌ Complexity gate: FAILED (${complexityViolations.length} violations)`, 'red')
        this.log('Complexity violations found in ESLint output', 'yellow')
        return !this.config.gates.complexity.failOnThreshold
      }
      
      this.log('✅ Complexity gate: PASSED', 'green')
      return true
    }
  }

  async runDuplicationGate() {
    if (!this.config.gates.duplication.enabled) {
      this.log('🔄 Duplication gate: SKIPPED', 'yellow')
      return true
    }

    this.log('🔄 Running duplication analysis...', 'blue')
    
    try {
      // Run ESLint with duplication rules
      const result = execSync('npm run lint:strict', { encoding: 'utf8', stdio: 'pipe' })
      
      this.log('✅ Duplication gate: PASSED', 'green')
      return true
    } catch (error) {
      // Parse ESLint output for duplication violations
      const output = error.stdout || error.stderr || ''
      const duplicationViolations = output.match(/no-duplicate-string|no-duplicated-branches/gi) || []
      
      if (duplicationViolations.length > 0) {
        this.log(`❌ Duplication gate: FAILED (${duplicationViolations.length} violations)`, 'red')
        return !this.config.gates.duplication.failOnThreshold
      }
      
      this.log('✅ Duplication gate: PASSED', 'green')
      return true
    }
  }

  async runSecurityGate() {
    if (!this.config.gates.security.enabled) {
      this.log('🔒 Security gate: SKIPPED', 'yellow')
      return true
    }

    this.log('🔒 Running security analysis...', 'blue')
    
    try {
      // Run npm audit
      execSync('npm audit --audit-level=moderate', { stdio: 'inherit' })
      
      this.log('✅ Security gate: PASSED', 'green')
      return true
    } catch (error) {
      this.log('❌ Security gate: FAILED (vulnerabilities found)', 'red')
      this.log('Run "npm audit fix" to resolve security issues', 'yellow')
      return !this.config.gates.security.failOnThreshold
    }
  }

  async runTypeCheckGate() {
    this.log('🔍 Running TypeScript type checking...', 'blue')
    
    try {
      execSync('npm run typecheck', { stdio: 'inherit' })
      this.log('✅ TypeScript gate: PASSED', 'green')
      return true
    } catch (error) {
      this.log('❌ TypeScript gate: FAILED', 'red')
      return false
    }
  }

  generateReport() {
    const reportDir = this.config.reporting.outputDir || './quality-reports'
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }

    const report = {
      timestamp: new Date().toISOString(),
      config: this.config,
      results: this.results,
      summary: {
        overall: this.results.overall,
        gates: Object.keys(this.config.gates).length,
        passed: this.results.overall === 'PASS'
      }
    }

    const reportPath = path.join(reportDir, 'quality-gate-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    this.log(`\n📋 Quality report generated: ${reportPath}`, 'cyan')
  }

  async run() {
    this.log('\n🚀 Starting Quality Gate Analysis\n', 'magenta')
    
    const gates = [
      { name: 'TypeScript', fn: () => this.runTypeCheckGate() },
      { name: 'Coverage', fn: () => this.runCoverageGate() },
      { name: 'Complexity', fn: () => this.runComplexityGate() },
      { name: 'Duplication', fn: () => this.runDuplicationGate() },
      { name: 'Security', fn: () => this.runSecurityGate() }
    ]

    let allPassed = true

    for (const gate of gates) {
      const passed = await gate.fn()
      if (!passed) {
        allPassed = false
      }
    }

    this.results.overall = allPassed ? 'PASS' : 'FAIL'
    
    // Generate report
    this.generateReport()

    // Final summary
    this.log('\n' + '='.repeat(50), 'cyan')
    if (allPassed) {
      this.log('🎉 ALL QUALITY GATES PASSED!', 'green')
      this.log('Code quality meets all requirements', 'green')
    } else {
      this.log('❌ QUALITY GATES FAILED!', 'red')
      this.log('Please fix the issues above before proceeding', 'red')
    }
    this.log('='.repeat(50), 'cyan')

    process.exit(allPassed ? 0 : 1)
  }
}

// Run quality gate if called directly
if (require.main === module) {
  const gate = new QualityGate()
  gate.run().catch(error => {
    console.error('Quality gate error:', error)
    process.exit(1)
  })
}

module.exports = QualityGate
