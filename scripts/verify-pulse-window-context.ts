
import fs from 'fs';
import path from 'path';

// Pulse Window Context Verification
// Checks:
// 1. Tracker Component Exists
// 2. Layout Imports Tracker
// 3. Layout Renders Tracker

const ROOT = process.cwd();
const TRACKER_PATH = path.join(ROOT, 'components/companion/PulseContextTracker.tsx');
const LAYOUT_PATH = path.join(ROOT, 'app/layout.tsx');

function verify() {
    console.log('🔍 Verifying Pulse Window Context Automation...');

    // 1. Check Component Exists
    if (!fs.existsSync(TRACKER_PATH)) {
        console.error('❌ PulseContextTracker.tsx not found.');
        process.exit(1);
    }
    console.log('✅ PulseContextTracker.tsx exists.');

    // 2. Check Layout Integration
    const layoutContent = fs.readFileSync(LAYOUT_PATH, 'utf-8');

    const hasImport = layoutContent.includes('PulseContextTracker');
    if (!hasImport) {
        console.error('❌ PulseContextTracker not imported in layout.tsx');
        process.exit(1);
    }
    console.log('✅ Layout imports PulseContextTracker.');

    const hasRender = layoutContent.includes('<PulseContextTracker />');
    if (!hasRender) {
        console.error('❌ PulseContextTracker not rendered in layout.tsx');
        process.exit(1);
    }
    console.log('✅ Layout renders <PulseContextTracker />.');

    console.log('\n🎉 PULSE WINDOW CONTEXT: STATIC CHECKS PASSED ✅');
    console.log('👉 Manual Verification Required: Open app/pulse/companion popup and navigate main window.');
}

verify();
