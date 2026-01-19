
import { isRhythmEligible } from '../lib/rhythm/isRhythmEligible';
import { validateNonDirective } from '../lib/voice/validateNonDirective';
import { RHYTHM_WINDOWS } from '../lib/rhythm/DailyRhythm';

console.log("WAITING FOR PHASE 16 VERIFICATION...");

// 1. Verify Rhythm Logic
function check(name: string, condition: boolean) {
    if (condition) console.log(`PASS: ${name}`);
    else {
        console.error(`FAIL: ${name}`);
        process.exit(1);
    }
}

// Mock time: 7 AM (Orientation Window)
const am7 = new Date(); am7.setHours(7, 0, 0, 0);
const res1 = isRhythmEligible(am7);
check("7 AM is Eligible (Orientation)", res1.eligible && res1.window === 'orientation');

// Mock time: 2 PM (Recalibration Window)
const pm2 = new Date(); pm2.setHours(14, 0, 0, 0);
const res2 = isRhythmEligible(pm2);
check("2 PM is Eligible (Recalibration)", res2.eligible && res2.window === 'recalibration');

// Mock time: 4 AM (No Window)
const am4 = new Date(); am4.setHours(4, 0, 0, 0);
const res3 = isRhythmEligible(am4);
check("4 AM is Ineligible (No Window)", !res3.eligible);

// Throttling Check
// User interacted at 7:15 AM
const lastInteraction = new Date(am7); lastInteraction.setMinutes(15);
// Now it's 8:00 AM (Same window)
const am8 = new Date(am7); am8.setHours(8);
const res4 = isRhythmEligible(am8, lastInteraction);
check("Throttling Active (Same Window)", !res4.eligible && res4.reason?.includes("Already interacted"));

// different day check
const tomorrow7 = new Date(am7); tomorrow7.setDate(tomorrow7.getDate() + 1);
const res5 = isRhythmEligible(tomorrow7, lastInteraction);
check("Throttling Reset (Next Day)", res5.eligible);


// 2. Verify Safeguards
const safePhrase = "I noticed you are busy.";
const unsafePhrase = "You must do this task.";
const unsafePhrase2 = "Tomorrow you need to wake up early.";

try {
    validateNonDirective(safePhrase);
    console.log("PASS: Safe phrase accepted.");
} catch (e) {
    console.error("FAIL: Safe phrase rejected.", e);
    process.exit(1);
}

try {
    validateNonDirective(unsafePhrase);
    console.error("FAIL: Unsafe phrase 'You must' NOT rejected.");
    process.exit(1);
} catch (e) {
    console.log("PASS: Unsafe phrase 'You must' rejected.");
}

try {
    validateNonDirective(unsafePhrase2);
    console.error("FAIL: Unsafe phrase 'Tomorrow you need to' NOT rejected.");
    process.exit(1);
} catch (e) {
    console.log("PASS: Unsafe phrase 'Tomorrow you need to' rejected.");
}

console.log("PHASE 16 VERIFIED ✅");
