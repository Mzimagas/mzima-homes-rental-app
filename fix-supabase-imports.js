const fs = require('fs');
const path = require('path');

// Files that need import path fixes
const filesToFix = [
  'src/app/test-auth-simple/page.tsx',
  'src/app/auth/signup/page.tsx', 
  'src/app/auth/callback/page.tsx',
  'src/app/dashboard/payments/page.tsx',
  'src/app/dashboard/tenants/[id]/page.tsx',
  'src/app/dashboard/tenants/page.tsx',
  'src/app/dashboard/properties/[id]/page.tsx',
  'src/app/dashboard/properties/page.tsx',
  'src/app/dashboard/maintenance/page.tsx',
  'src/app/dashboard/documents/page.tsx',
  'src/app/dashboard/page.tsx',
  'src/app/dashboard/notifications/page.tsx',
  'src/app/dashboard/reports/page.tsx',
  'src/app/test-auth/page.tsx',
  'src/app/test-signout/page.tsx',
  'src/components/payments/payment-analytics.tsx',
  'src/components/payments/payment-form.tsx',
  'src/components/payments/payment-history.tsx',
  'src/components/property/UserManagement.tsx',
  'src/components/tenants/tenant-form.tsx',
  'src/components/dashboard/corrected-dashboard.tsx',
  'src/components/properties/unit-form.tsx',
  'src/components/properties/property-form.tsx',
  'src/components/properties/corrected-properties-page.tsx',
  'src/components/maintenance/maintenance-form.tsx',
  'src/components/documents/document-list.tsx',
  'src/components/documents/document-upload.tsx',
  'src/components/notifications/automated-notifications.tsx',
  'src/components/notifications/custom-notification-form.tsx',
  'src/components/notifications/notification-rule-form.tsx',
  'src/components/notifications/notification-settings.tsx',
  'src/components/reports/financial-reports.tsx',
  'src/components/reports/property-reports.tsx',
  'src/components/reports/tenant-analytics.tsx',
  'src/components/reports/occupancy-reports.tsx'
];

// Function to calculate the correct relative path to src/lib/supabase-client
function getCorrectImportPath(filePath) {
  // Count how many directories deep we are from src/
  const pathParts = filePath.split('/');
  const srcIndex = pathParts.indexOf('src');
  const depth = pathParts.length - srcIndex - 2; // -2 for src and filename

  if (depth === 0) {
    return './lib/supabase-client'; // Same level as src
  } else {
    return '../'.repeat(depth) + 'lib/supabase-client';
  }
}

// Function to fix imports in a file
function fixImportsInFile(filePath) {
  try {
    const fullPath = path.join(__dirname, filePath);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️ File not found: ${filePath}`);
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const correctPath = getCorrectImportPath(filePath);

    // Replace all variations of the old import paths
    let updatedContent = content
      .replace(/from\s+['"]\.\.\/\.\.\/\.\.\/\.\.\/lib\/supabase-client['"]/g, `from '${correctPath}'`)
      .replace(/from\s+['"]\.\.\/\.\.\/\.\.\/lib\/supabase-client['"]/g, `from '${correctPath}'`)
      .replace(/from\s+['"]\.\.\/\.\.\/lib\/supabase-client['"]/g, `from '${correctPath}'`)
      .replace(/from\s+['"]\.\.\/lib\/supabase-client['"]/g, `from '${correctPath}'`);

    if (content !== updatedContent) {
      fs.writeFileSync(fullPath, updatedContent);
      console.log(`✅ Fixed imports in: ${filePath} -> ${correctPath}`);
    } else {
      console.log(`ℹ️ No changes needed in: ${filePath}`);
    }

  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
  }
}

console.log('🔧 Fixing Supabase import paths...\n');

// Fix all files
filesToFix.forEach(fixImportsInFile);

console.log('\n✅ Import path fixes completed!');
console.log('All files should now import from the correct src/lib/supabase-client path.');
