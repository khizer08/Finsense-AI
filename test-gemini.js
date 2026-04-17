#!/usr/bin/env node

/**
 * Test Helper: Gemini Insight Extraction
 * 
 * Usage:
 *   node test-gemini.js "Your transcript text here"
 * 
 * Examples:
 *   node test-gemini.js "I need to pay my EMI of ₹50000 by 5th April"
 *   node test-gemini.js "Let's discuss the SIP I want to start"
 */

const fs = require('fs');
const path = require('path');

// Load environment
require('dotenv').config({path: path.join(__dirname, '.env')});

const {extractInsights} = require('./backend/src/services/gemini');

const TEST_TRANSCRIPTS = {
  sip_basic: `I need to start an SIP of ₹5000 per month for my child's education. 
I've discussed with my advisor and need to open the account by 25th April. 
The setup fees are around ₹500 and monthly charges are ₹50.`,

  emi_urgent: `My home loan EMI is ₹50000 per month, due on the 5th of every month. 
I missed the payment in February and now I need to catch up this month. 
The next payment is due in just 3 days. I should also pay the late fees of ₹2000.`,

  mixed_deadlines: `I have several things to sort out financially:
1. Credit card bill of ₹15000 due by 22nd April
2. Insurance premium of ₹8000 due by end of this month
3. Property tax of ₹25000 needs to be paid within 15 days
4. Car loan EMI of ₹8500 on 10th of every month`,

  budget_planning: `I want to budget ₹30000 for monthly household expenses. 
My manager suggested I should allocate more for emergency funds. 
I'm also thinking about investment options to save for retirement.`,

  non_financial: `Let's talk about the weather today. The garden is looking great with all the flowers blooming.`,

  unclear_deadline: `I told my friend I would help with some financial planning. 
We need to meet up soon to discuss it, maybe next week or so.`,
};

async function testTranscript(name, transcript) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${name}`);
  console.log(`${'='.repeat(80)}`);
  console.log('\nTranscript:');
  console.log(`"${transcript}"`);

  try {
    console.log('\n⏳ Calling Gemini API...');
    const insights = await extractInsights(transcript);

    console.log('\n✅ Success! Results:');
    console.log(JSON.stringify(insights, null, 2));

    // Validate structure
    console.log('\n📋 Validation:');
    console.log(`  ✓ Summary: ${insights.summary ? '✓' : '✗'}`);
    console.log(`  ✓ Entities: ${insights.entities?.length || 0} found`);
    if (insights.entities?.length > 0) {
      insights.entities.forEach((e, i) => {
        console.log(`    [${i}] ${e.type}: ${e.value} (amt: ${e.amount}, deadline: ${e.deadline})`);
      });
    }
    console.log(`  ✓ Payment Deadlines: ${insights.paymentDeadlines?.length || 0} found`);
    if (insights.paymentDeadlines?.length > 0) {
      insights.paymentDeadlines.forEach((d, i) => {
        console.log(`    [${i}] ${d.description} (due: ${d.dueDate}, days: ${d.daysUntilDue})`);
      });
    }
    console.log(`  ✓ Keywords: ${insights.keywords?.length || 0}`);
    console.log(`  ✓ Action Items: ${insights.actionItems?.length || 0}`);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('\n🧪 FinSense AI - Gemini Testing Suite\n');

  if (process.argv[2]) {
    // Run with custom transcript
    const transcript = process.argv.slice(2).join(' ');
    await testTranscript('Custom Transcript', transcript);
  } else {
    // Run all built-in tests
    console.log('Running all test scenarios...');
    for (const [name, transcript] of Object.entries(TEST_TRANSCRIPTS)) {
      await testTranscript(name.replace(/_/g, ' ').toUpperCase(), transcript);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('✅ Testing complete!');
}

runTests().catch(console.error);
