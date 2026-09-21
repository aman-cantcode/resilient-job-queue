import assert from 'node:assert/strict';
import { getArg } from '../scripts/utils/cliArgs.js';

const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, pass: true });
    console.log(`✓ PASS  ${name}`);
  } catch (err) {
    results.push({ name, pass: false, error: err.message });
    console.log(`✗ FAIL  ${name}`);
    console.log(`        ${err.message}`);
  }
}


//check concurrency value: flag
test('returns the value when the flag is present', () => {
  process.argv = ['node', 'script.js', '--concurrency=5'];
  assert.equal(getArg('concurrency', 1), '5');
});

test('returns the fallback when the flag is absent', () => {
  process.argv = ['node', 'script.js'];
  assert.equal(getArg('concurrency', 1), 1);
});

test('picks the right flag among several', () => {
  process.argv = ['node', 'script.js', '--fail-times=2', '--sleep-ms=500', '--count=3'];
  assert.equal(getArg('sleep-ms', 0), '500');
  assert.equal(getArg('count', 1), '3');
});

test('does not partially match a longer flag name', () => {
  process.argv = ['node', 'script.js', '--count=3'];
  assert.equal(getArg('coun', 'x'), 'x');
});

const passed = results.filter((r) => r.pass).length;
console.log(`\n${passed}/${results.length} passed`);
if (passed !== results.length) process.exitCode = 1;
