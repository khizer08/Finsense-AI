/**
 * NotificationServiceTestHelper.js
 * 
 * Manual testing helper for notification features in React Native
 * 
 * Usage in React component:
 *   import {testNotificationScenarios} from './NotificationServiceTestHelper'
 *   
 *   // In your test button handler:
 *   const handleTestNotifications = async () => {
 *     await testNotificationScenarios();
 *   }
 */

import {scheduleDeadlineNotification} from './NotificationService';

export const TEST_PAYMENT_DEADLINES = {
  // Urgent scenarios
  overdue: {
    description: 'Overdue Tax Payment',
    dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    daysUntilDue: -1,
    requiresAction: true,
  },
  today: {
    description: 'Home EMI Payment - Due TODAY',
    dueDate: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    daysUntilDue: 0,
    requiresAction: true,
  },
  urgent_12h: {
    description: 'Credit Card Bill - Due in 12 hours',
    dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    daysUntilDue: 0.5,
    requiresAction: true,
  },
  // Warning scenarios
  warning_36h: {
    description: 'Insurance Premium - Due in 36 hours',
    dueDate: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
    daysUntilDue: 1.5,
    requiresAction: true,
  },
  warning_48h: {
    description: 'Loan Repayment - Due in 48 hours',
    dueDate: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    daysUntilDue: 2,
    requiresAction: true,
  },
  // Info scenarios
  info_3days: {
    description: 'Monthly SIP - Due in 3 days',
    dueDate: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    daysUntilDue: 3,
    requiresAction: true,
  },
  info_7days: {
    description: 'Property Tax - Due in 7 days',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    daysUntilDue: 7,
    requiresAction: true,
  },
  // Non-actionable
  non_actionable: {
    description: 'Old Deadline (informational only)',
    dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    daysUntilDue: 10,
    requiresAction: false,
  },
};

/**
 * Test all notification urgency scenarios
 * Displays notifications for each scenario with appropriate urgency levels
 */
export async function testNotificationScenarios() {
  console.log('[NotificationTest] Starting notification urgency tests...');

  const scenarios = Object.entries(TEST_PAYMENT_DEADLINES);
  let completed = 0;
  let failed = 0;

  for (const [name, deadline] of scenarios) {
    try {
      console.log(`[NotificationTest] Testing: ${name}`);
      await scheduleDeadlineNotification(deadline, `test_${name}`);
      completed++;
      // Add delay between notifications for visibility
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[NotificationTest] Failed for ${name}:`, error);
      failed++;
    }
  }

  console.log(`[NotificationTest] Complete! Success: ${completed}, Failed: ${failed}`);

  return {completed, failed, total: scenarios.length};
}

/**
 * Test a specific notification scenario
 */
export async function testNotificationScenario(scenarioName) {
  const scenario = TEST_PAYMENT_DEADLINES[scenarioName];
  if (!scenario) {
    throw new Error(`Unknown scenario: ${scenarioName}`);
  }

  console.log(`[NotificationTest] Testing scenario: ${scenarioName}`);
  await scheduleDeadlineNotification(scenario, `test_${scenarioName}`);
}

/**
 * Get all test scenarios for UI selection
 */
export function getTestScenarios() {
  return Object.keys(TEST_PAYMENT_DEADLINES);
}

/**
 * Get scenario details for display
 */
export function getScenarioDetails(scenarioName) {
  const scenario = TEST_PAYMENT_DEADLINES[scenarioName];
  if (!scenario) return null;

  return {
    name: scenarioName,
    ...scenario,
    daysDisplay: scenario.daysUntilDue < 0 
      ? 'OVERDUE' 
      : scenario.daysUntilDue === 0 
      ? 'TODAY'
      : `${scenario.daysUntilDue.toFixed(1)} day${scenario.daysUntilDue > 1 ? 's' : ''}`,
  };
}
