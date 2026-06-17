import { parseTaskerExpensePayload } from './parser.js'

const samplePayload = {
  groupId: 'test-group-123',
  sender: 'AX-SBIUPI',
  rawSms: 'Rs.245.50 debited from A/c XX1234 on 17-06-2026 at Zomato UPI Ref 123456.',
  timestamp: '2026-06-17T14:23:00+05:30',
  deviceName: 'Swathi-Android',
}

const parsed = parseTaskerExpensePayload(samplePayload)
console.log('Parsed payload:')
console.log(JSON.stringify(parsed, null, 2))
