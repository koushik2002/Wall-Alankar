import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TALLY_HEADERS} from '../src/index.js';

const expectedHeaders = [
  'Voucher Type','Invoice #','Invoice Date','Reference','Party Code','Party Name','SUPPLEMNETARY NAME','GST #',
  'Address 1','Address 2','Address 3','Address 4','Country','State','Blank 1','Blank 2','Blank 3','Blank 4','Blank 5',
  'Narration','Voucher Amount','Sales @ 5%','SGST @ 2.5%','CGST @ 2.5%','Sales @ 12%','SGST @ 6%',
  'CGST @ 6%','Sales @ 18%','SGST @ 9%','CGST @ 9%','IGST Sales @ 5%','IGST @ 5%','IGST Sales @ 18%',
  'IGST @ 18%','Transportation','Discount','Round Off',
];

test('Tally contract preserves supplied Sales.xlsx A-to-AK headers', () => {
  assert.equal(TALLY_HEADERS.length, 37);
  assert.deepEqual(TALLY_HEADERS, expectedHeaders);
});

test('schema enforces non-negative inventory and immutable export membership', async () => {
  const schema = await readFile(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8');
  assert.match(schema, /quantity INTEGER NOT NULL DEFAULT 0 CHECK \(quantity >= 0\)/);
  assert.match(schema, /content_sha256 TEXT NOT NULL/);
  assert.match(schema, /PRIMARY KEY \(batch_id, invoice_id\)/);
});

test('coming soon rows cannot carry purchasable identity', async () => {
  const schema = await readFile(new URL('../migrations/0001_initial.sql', import.meta.url), 'utf8');
  assert.match(schema, /status = 'coming_soon' AND sku IS NULL/);
});

