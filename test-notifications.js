#!/usr/bin/env node

/**
 * Test Helper: Notification Urgency Simulation
 * 
 * Simulates different payment deadline scenarios to verify notification urgency levels
 * are correctly calculated and displayed.
 * 
 * Usage:
 *   node test-notifications.js
 */

function calculateUrgency(daysUntilDue) {
  if (daysUntilDue < 0) return 'OVERDUE';
  if (daysUntilDue === 0) return 'TODAY';
  if (daysUntilDue < 1) return 'CRITICAL (<24h)';
  if (daysUntilDue <= 2) return 'HIGH (<48h)';
  return 'INFO (≥48h)';
}

function getNotificationConfig(daysUntilDue) {
  const configs = {
    'OVERDUE': {
      title: '🚨 OVERDUE PAYMENT',
      color: '#DC2626',
      sound: 'loud',
      importance: 'MAX',
    },
    'TODAY': {
      title: '⚠️ Payment Due Today',
      color: '#EF4444',
      sound: 'alert',
      importance: 'MAX',
    },
    'CRITICAL (<24h)': {
      title: '⚠️ Payment Due Today',
      color: '#EF4444',
      sound: 'alert',
      importance: 'MAX',
    },
    'HIGH (<48h)': {
      title: '⏰ Payment Due Soon',
      color: '#F97316',
      sound: 'default',
      importance: 'HIGH',
    },
    'INFO (≥48h)': {
      title: '📌 Payment Reminder',
      color: '#3B82F6',
      sound: 'none',
      importance: 'DEFAULT',
    },
  };

  const urgency = calculateUrgency(daysUntilDue);
  return {urgency, ...configs[urgency]};
}

function formatTime(hours) {
  if (hours < 1) return `${Math.round(hours * 60)} minutes`;
  if (hours < 24) return `${Math.round(hours)} hours`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? '' : 's'}`;
}

const TEST_SCENARIOS = [
  {description: 'Payment already overdue by 2 days', daysUntilDue: -2},
  {description: 'Payment overdue by 1 day', daysUntilDue: -1},
  {description: 'Payment due TODAY (12 hours left)', daysUntilDue: 0.5},
  {description: 'Payment due TODAY (1 hour left)', daysUntilDue: 0.04},
  {description: 'Payment due in 18 hours', daysUntilDue: 0.75},
  {description: 'Payment due in 24 hours', daysUntilDue: 1},
  {description: 'Payment due in 36 hours (1.5 days)', daysUntilDue: 1.5},
  {description: 'Payment due in 48 hours (2 days)', daysUntilDue: 2},
  {description: 'Payment due in 72 hours (3 days)', daysUntilDue: 3},
  {description: 'Payment due in 1 week', daysUntilDue: 7},
  {description: 'Payment due in 2 weeks', daysUntilDue: 14},
];

console.log('\n🔔 FinSense AI - Notification Urgency Testing\n');
console.log(`Expected Behavior:`);
console.log(`  • <24h (including today)     → 🚨 CRITICAL (RED, MAX sound)`);
console.log(`  • <48h                       → ⏰ HIGH (ORANGE, default sound)`);
console.log(`  • ≥48h                       → 📌 INFO (BLUE, silent)`);
console.log(`  • Overdue                    → 🚨 OVERDUE (DARK RED, loud sound)\n`);

console.log(`${'SCENARIO'.padEnd(40)} | ${'DAYS'.padEnd(8)} | ${'TIME LEFT'.padEnd(15)} | ${'URGENCY'.padEnd(18)} | CONFIG`);
console.log(`${'-'.repeat(40)}-+-${'-'.repeat(8)}-+-${'-'.repeat(15)}-+-${'-'.repeat(18)}-+-${'-'.repeat(50)}`);

TEST_SCENARIOS.forEach(({description, daysUntilDue}) => {
  const config = getNotificationConfig(daysUntilDue);
  const timeFormat = formatTime(daysUntilDue * 24);

  console.log(
    `${description.padEnd(40)} | ` +
    `${daysUntilDue.toFixed(2).padEnd(8)} | ` +
    `${timeFormat.padEnd(15)} | ` +
    `${config.urgency.padEnd(18)} | ` +
    `${config.title} [${config.color}]`
  );
});

console.log(`\n${'='.repeat(140)}\n`);

console.log('📋 Verification Checklist:\n');
console.log('[] Overdue payments: Dark red (#DC2626) with MAX importance');
console.log('[] Today/Critical (<24h): Red (#EF4444) with MAX importance and alert sound');
console.log('[] Soon (24-48h): Orange (#F97316) with HIGH importance');
console.log('[] Later (>48h): Blue (#3B82F6) with DEFAULT importance');
console.log('[] Each notification can be snoozed or marked as done');
console.log('[] Notifications appear at the right urgency level based on time\n');

console.log('🧪 Test Case Generator:\n');

const testCases = [
  {
    name: 'EMI due in 36 hours',
    description: 'Home Loan EMI of ₹50,000',
    daysUntilDue: 1.5,
  },
  {
    name: 'Tax due in 18 hours',
    description: 'Income Tax Payment',
    daysUntilDue: 0.75,
  },
  {
    name: 'Overdue insurance',
    description: 'Car Insurance Premium',
    daysUntilDue: -1,
  },
  {
    name: 'SIP due in 7 days',
    description: 'Monthly SIP Investment',
    daysUntilDue: 7,
  },
];

testCases.forEach((testCase, i) => {
  const config = getNotificationConfig(testCase.daysUntilDue);
  console.log(`${i + 1}. ${testCase.name}`);
  console.log(`   Description: ${testCase.description}`);
  console.log(`   Urgency: ${config.urgency}`);
  console.log(`   Title: ${config.title}`);
  console.log(`   Expected: Color=${config.color}, Sound=${config.sound}, Importance=${config.importance}\n`);
});

console.log('✅ Notification urgency testing complete!\n');
