/**
 * ReturnDesk seed script.
 *
 * Fills a CLEAN database with 33 return requests covering every status
 * (Open, In Review, Approved, Rejected, Completed) and every reason
 * (Damaged, Wrong Item, Size Issue, Not As Described, Changed Mind),
 * with notes on many of them. All rows obey the business rules —
 * including the deliberate ORD-1007 pair: a Rejected request followed by
 * a live Open one for the same order + item (legal, and handy for testing
 * that a third one is refused).
 *
 * WARNING: this deletes existing rows in return_notes and
 * return_requests before inserting. Run it against a fresh database.
 *
 * Usage (Node 20+):
 *   node --env-file=.env scripts/seed.mjs
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL),
 *               SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing environment. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (see .env.example).');
  process.exit(1);
}

const supabase = createClient(url, key);

// reference, name, email, phone, order, item, sku, qty, reason, status, resolution, refund, created, updated
const REQUESTS = [
  ['RTN-2026-100001', 'Amara Osei', 'amara.osei@example.com', '+1 555 010 1101', 'ORD-1042', 'Trail Runner Shoes', 'SKU-SHOE-TR9', 1, 'Size Issue', 'Open', null, null, '2026-11-24T09:12:00Z', '2026-11-24T09:12:00Z'],
  ['RTN-2026-100002', 'Ben Carter', 'ben.carter@example.com', '+1 555 010 1102', 'ORD-1043', 'Ceramic Dinner Set (12pc)', 'SKU-DIN-12W', 1, 'Damaged', 'Open', null, null, '2026-11-24T11:40:00Z', '2026-11-24T11:40:00Z'],
  ['RTN-2026-100003', 'Priya Nair', 'priya.nair@example.com', null, 'ORD-1044', 'Wool Blend Coat', 'SKU-COAT-WM', 1, 'Not As Described', 'Open', null, null, '2026-11-25T08:05:00Z', '2026-11-25T08:05:00Z'],
  ['RTN-2026-100004', 'Tom Becker', 'tom.becker@example.com', '+1 555 010 1104', 'ORD-1045', 'Bluetooth Speaker', 'SKU-SPK-BT2', 2, 'Changed Mind', 'Open', null, null, '2026-11-25T13:22:00Z', '2026-11-25T13:22:00Z'],
  ['RTN-2026-100005', 'Sofia Reyes', 'sofia.reyes@example.com', '+1 555 010 1105', 'ORD-1046', 'Yoga Mat Pro', 'SKU-YOGA-P6', 1, 'Wrong Item', 'Open', null, null, '2026-11-25T16:48:00Z', '2026-11-25T16:48:00Z'],
  ['RTN-2026-100006', 'James Whitfield', 'james.whitfield@example.com', '+1 555 010 1106', 'ORD-1047', 'Espresso Machine', 'SKU-ESP-X1', 1, 'Damaged', 'Open', null, null, '2026-11-26T09:31:00Z', '2026-11-26T09:31:00Z'],
  ['RTN-2026-100007', 'Aisha Bello', 'aisha.bello@example.com', null, 'ORD-1048', 'Kids Rain Boots', 'SKU-BOOT-K3', 1, 'Size Issue', 'Open', null, null, '2026-11-26T12:14:00Z', '2026-11-26T12:14:00Z'],
  ['RTN-2026-100008', 'Marco Rossi', 'marco.rossi@example.com', '+1 555 010 1108', 'ORD-1049', 'Desk Lamp', 'SKU-LAMP-D4', 1, 'Not As Described', 'Open', null, null, '2026-11-26T15:57:00Z', '2026-11-26T15:57:00Z'],
  ['RTN-2026-100009', 'Hannah Kim', 'hannah.kim@example.com', '+1 555 010 1109', 'ORD-1050', 'Wireless Earbuds', 'SKU-EAR-W5', 1, 'Damaged', 'In Review', null, null, '2026-11-20T10:20:00Z', '2026-11-21T09:02:00Z'],
  ['RTN-2026-100010', 'Oliver Grant', 'oliver.grant@example.com', '+1 555 010 1110', 'ORD-1051', 'Standing Desk Frame', 'SKU-DESK-S2', 1, 'Wrong Item', 'In Review', null, null, '2026-11-20T14:44:00Z', '2026-11-22T11:30:00Z'],
  ['RTN-2026-100011', 'Fatima Al-Said', 'fatima.alsaid@example.com', null, 'ORD-1052', 'Linen Dress', 'SKU-DRS-LN8', 1, 'Size Issue', 'In Review', null, null, '2026-11-21T09:18:00Z', '2026-11-21T15:41:00Z'],
  ['RTN-2026-100012', 'Noah Bergström', 'noah.bergstrom@example.com', '+1 555 010 1112', 'ORD-1053', 'Cast Iron Skillet', 'SKU-PAN-CI10', 1, 'Not As Described', 'In Review', null, null, '2026-11-21T17:26:00Z', '2026-11-23T10:12:00Z'],
  ['RTN-2026-100013', 'Ella Thompson', 'ella.thompson@example.com', '+1 555 010 1113', 'ORD-1054', 'Board Game: Harbor Lights', 'SKU-GME-HL1', 1, 'Changed Mind', 'In Review', null, null, '2026-11-22T08:39:00Z', '2026-11-22T08:39:00Z'],
  ['RTN-2026-100014', 'Yusuf Adeyemi', 'yusuf.adeyemi@example.com', '+1 555 010 1114', 'ORD-1055', 'Running Watch', 'SKU-WCH-R7', 1, 'Damaged', 'In Review', null, null, '2026-11-22T19:03:00Z', '2026-11-24T09:55:00Z'],
  ['RTN-2026-100015', 'Grace Mullen', 'grace.mullen@example.com', null, 'ORD-1056', 'Cotton Hoodie', 'SKU-HOD-C9', 2, 'Wrong Item', 'In Review', null, null, '2026-11-23T12:47:00Z', '2026-11-23T16:20:00Z'],
  ['RTN-2026-100016', 'Daniel Okafor', 'daniel.okafor@example.com', '+1 555 010 1116', 'ORD-1057', 'Mechanical Keyboard', 'SKU-KBD-M3', 1, 'Damaged', 'Approved', 'Refund', 129.99, '2026-11-15T09:44:00Z', '2026-11-17T13:15:00Z'],
  ['RTN-2026-100017', 'Ingrid Johansson', 'ingrid.johansson@example.com', '+1 555 010 1117', 'ORD-1058', 'Winter Gloves', 'SKU-GLV-W2', 1, 'Size Issue', 'Approved', 'Replacement', null, '2026-11-16T11:08:00Z', '2026-11-18T10:26:00Z'],
  ['RTN-2026-100018', 'Carlos Mendez', 'carlos.mendez@example.com', null, 'ORD-1059', 'Coffee Grinder', 'SKU-GRN-C4', 1, 'Not As Described', 'Approved', 'Store Credit', null, '2026-11-17T15:33:00Z', '2026-11-19T09:40:00Z'],
  ['RTN-2026-100019', 'Meera Joshi', 'meera.joshi@example.com', '+1 555 010 1119', 'ORD-1060', 'Silk Scarf', 'SKU-SCF-S5', 1, 'Changed Mind', 'Approved', 'Store Credit', null, '2026-11-18T10:52:00Z', '2026-11-20T14:18:00Z'],
  ['RTN-2026-100020', 'Peter Novak', 'peter.novak@example.com', '+1 555 010 1120', 'ORD-1061', 'Air Fryer 5L', 'SKU-FRY-A5', 1, 'Damaged', 'Approved', 'Refund', 89.5, '2026-11-19T13:29:00Z', '2026-11-21T16:02:00Z'],
  ['RTN-2026-100021', 'Chen Wei', 'chen.wei@example.com', '+1 555 010 1121', 'ORD-1062', 'Office Chair', 'SKU-CHR-O7', 1, 'Wrong Item', 'Approved', 'Replacement', null, '2026-11-20T16:11:00Z', '2026-11-23T09:27:00Z'],
  ['RTN-2026-100022', 'Rosa Delgado', 'rosa.delgado@example.com', '+1 555 010 1122', 'ORD-1063', 'Perfume 50ml', 'SKU-PRF-50', 1, 'Changed Mind', 'Rejected', null, null, '2026-11-10T09:36:00Z', '2026-11-11T14:44:00Z'],
  ['RTN-2026-100023', 'Samir Haddad', 'samir.haddad@example.com', null, 'ORD-1064', 'Smartphone Case', 'SKU-CSE-P8', 1, 'Wrong Item', 'Rejected', null, null, '2026-11-11T12:19:00Z', '2026-11-12T10:31:00Z'],
  ['RTN-2026-100024', 'Julia Fischer', 'julia.fischer@example.com', '+1 555 010 1124', 'ORD-1065', 'Knit Sweater', 'SKU-SWT-K6', 1, 'Size Issue', 'Rejected', null, null, '2026-11-12T15:58:00Z', '2026-11-13T11:23:00Z'],
  ['RTN-2026-100025', 'Kevin Doyle', 'kevin.doyle@example.com', '+1 555 010 1125', 'ORD-1007', 'Leather Boots', 'SKU-BOOT-42', 1, 'Size Issue', 'Rejected', null, null, '2026-11-05T10:14:00Z', '2026-11-06T09:48:00Z'],
  ['RTN-2026-100026', 'Kevin Doyle', 'kevin.doyle@example.com', '+1 555 010 1125', 'ORD-1007', 'Leather Boots', 'SKU-BOOT-42', 1, 'Size Issue', 'Open', null, null, '2026-11-26T18:22:00Z', '2026-11-26T18:22:00Z'],
  ['RTN-2026-100027', 'Laura Petit', 'laura.petit@example.com', '+1 555 010 1127', 'ORD-1066', 'Vinyl Record — Midnight Blue', 'SKU-VNL-R3', 1, 'Damaged', 'Rejected', null, null, '2026-11-13T09:27:00Z', '2026-11-14T13:36:00Z'],
  ['RTN-2026-100028', 'Ahmed Farouk', 'ahmed.farouk@example.com', '+1 555 010 1128', 'ORD-1067', 'Blender Pro', 'SKU-BLD-P9', 1, 'Damaged', 'Completed', 'Refund', 74.25, '2026-11-03T11:41:00Z', '2026-11-08T10:05:00Z'],
  ['RTN-2026-100029', 'Nina Kowalski', 'nina.kowalski@example.com', '+1 555 010 1129', 'ORD-1068', 'Baby Stroller', 'SKU-STRL-B2', 1, 'Wrong Item', 'Completed', 'Replacement', null, '2026-11-04T14:09:00Z', '2026-11-10T15:52:00Z'],
  ['RTN-2026-100030', 'George Ade', 'george.ade@example.com', null, 'ORD-1069', 'Denim Jacket', 'SKU-JKT-D3', 1, 'Size Issue', 'Completed', 'Store Credit', null, '2026-11-06T09:53:00Z', '2026-11-11T12:17:00Z'],
  ['RTN-2026-100031', 'Sara Lindqvist', 'sara.lindqvist@example.com', '+1 555 010 1131', 'ORD-1070', 'Stoneware Tableware Set', 'SKU-TBL-S8', 1, 'Not As Described', 'Completed', 'Refund', 54.0, '2026-11-07T16:24:00Z', '2026-11-12T09:39:00Z'],
  ['RTN-2026-100032', 'Victor Hale', 'victor.hale@example.com', '+1 555 010 1132', 'ORD-1071', 'Tent 4-Person', 'SKU-TNT-44', 1, 'Changed Mind', 'Completed', 'Refund', 199.99, '2026-11-08T10:47:00Z', '2026-11-14T16:28:00Z'],
  ['RTN-2026-100033', 'Zara Ahmed', 'zara.ahmed@example.com', '+1 555 010 1133', 'ORD-1072', 'Skincare Set', 'SKU-SKN-Z1', 1, 'Damaged', 'Completed', 'Replacement', null, '2026-11-09T13:15:00Z', '2026-11-15T11:44:00Z'],
];

// reference -> [author, body, created_at][]
const NOTES = {
  'RTN-2026-100002': [['Support Agent', 'Customer sent photos: two dinner plates arrived chipped at the rim. Packaging looked intact in transit photos. Awaiting review decision.', '2026-11-24T12:05:00Z']],
  'RTN-2026-100006': [['Support Agent', 'Customer reports the espresso machine leaks from the group head on first use. Asked for a short video before deciding.', '2026-11-26T10:02:00Z']],
  'RTN-2026-100009': [
    ['Support Agent', 'Left earbud does not charge. Asked customer to try the spare cable and confirm the case LED behaviour.', '2026-11-20T15:30:00Z'],
    ['Support Agent', 'Customer confirmed the earbud is still dead with a known-good cable. Leaning approve — checking warranty window.', '2026-11-21T09:02:00Z'],
  ],
  'RTN-2026-100010': [['Warehouse (via agent)', 'Picking log shows the single-motor frame was picked instead of the dual-motor model. Warehouse error confirmed.', '2026-11-22T11:30:00Z']],
  'RTN-2026-100011': [['Support Agent', 'Customer ordered size M and says it fits like a size S. Checking the size chart against the supplier spec.', '2026-11-21T15:41:00Z']],
  'RTN-2026-100014': [['Support Agent', 'Screen cracked corner on arrival; courier photo at delivery shows the outer box was crushed. Gathering carrier claim reference.', '2026-11-24T09:55:00Z']],
  'RTN-2026-100016': [
    ['Support Agent', 'Three switches dead on arrival; customer video confirms. Approved for refund — do not ask for the unit back (low salvage value).', '2026-11-17T13:10:00Z'],
    ['Support Agent', 'Refund of $129.99 sent to the original payment method. Complete once the customer confirms receipt.', '2026-11-17T13:15:00Z'],
  ],
  'RTN-2026-100017': [['Support Agent', 'Replacement in size L reserved from stock. Customer will return the size M pair with the prepaid label.', '2026-11-18T10:26:00Z']],
  'RTN-2026-100018': [['Support Agent', 'Listing said "stainless burr" but the shipped unit has a blade. Listing team notified to fix the copy. Customer accepted store credit.', '2026-11-19T09:40:00Z']],
  'RTN-2026-100020': [['Support Agent', 'Basket coating peeling after two uses. Batch flagged with QA. Refund approved; collection arranged.', '2026-11-21T16:02:00Z']],
  'RTN-2026-100022': [['Support Agent', 'Rejected: fragrance was opened and sprayed. Hygiene policy excludes opened perfume from change-of-mind returns. Customer emailed the policy link.', '2026-11-11T14:44:00Z']],
  'RTN-2026-100023': [['Support Agent', 'Rejected: order history shows the customer selected this phone model at checkout, and the correct case was shipped. Offered an exchange at customer postage instead.', '2026-11-12T10:31:00Z']],
  'RTN-2026-100024': [['Support Agent', 'Rejected: sweater arrived washed and shrunk, tags removed. Outside resaleable condition per returns policy.', '2026-11-13T11:23:00Z']],
  'RTN-2026-100025': [['Support Agent', 'Rejected: boots show outdoor wear on the soles, so this is not a try-on size exchange. Photos on file.', '2026-11-06T09:48:00Z']],
  'RTN-2026-100026': [['Support Agent', 'Customer re-requested for the same boots, this time with indoor try-on photos of a second pair from the same order. Earlier request (Rejected) does not block this one — needs a fresh review.', '2026-11-26T18:22:00Z']],
  'RTN-2026-100027': [['Support Agent', 'Rejected: scratch pattern is consistent with a dropped needle after delivery; sleeve and shipping box undamaged. Explained the decision by email.', '2026-11-14T13:36:00Z']],
  'RTN-2026-100028': [
    ['Support Agent', 'Jar cracked at the base thread on arrival. Refund approved.', '2026-11-05T09:20:00Z'],
    ['Support Agent', 'Customer confirmed the $74.25 refund landed. Closing as Completed.', '2026-11-08T10:05:00Z'],
  ],
  'RTN-2026-100029': [['Support Agent', 'Wrong colour shipped. Replacement stroller delivered 10 Nov and the original collected the same day.', '2026-11-10T15:52:00Z']],
  'RTN-2026-100031': [['Support Agent', 'Glaze colour differs materially from the listing photos. Refund issued and listing photos flagged for reshoot.', '2026-11-12T09:39:00Z']],
  'RTN-2026-100032': [['Support Agent', 'Unopened, returned within the window. Inspected on arrival — resaleable. Refund released.', '2026-11-14T16:28:00Z']],
  'RTN-2026-100033': [['Support Agent', 'Pump bottle leaked in transit. Replacement set shipped with extra padding; customer confirmed arrival.', '2026-11-15T11:44:00Z']],
};

async function main() {
  console.log('Clearing existing ReturnDesk data…');
  const delNotes = await supabase.from('return_notes').delete().neq('id', 0);
  if (delNotes.error) throw delNotes.error;
  const delReqs = await supabase.from('return_requests').delete().neq('id', 0);
  if (delReqs.error) throw delReqs.error;

  const rows = REQUESTS.map(([reference, customer_name, customer_email, customer_phone, order_id, item_name, item_sku, quantity, reason, status, resolution, refund_amount, created_at, updated_at]) => ({
    reference, customer_name, customer_email, customer_phone, order_id, item_name, item_sku, quantity, reason, status, resolution, refund_amount, created_at, updated_at,
  }));

  console.log(`Inserting ${rows.length} requests…`);
  const { data: inserted, error: insertError } = await supabase.from('return_requests').insert(rows).select('id, reference, status, reason');
  if (insertError) throw insertError;

  const idByRef = new Map(inserted.map((r) => [r.reference, r.id]));
  const noteRows = [];
  for (const [ref, list] of Object.entries(NOTES)) {
    const request_id = idByRef.get(ref);
    if (!request_id) continue;
    for (const [author, body, created_at] of list) noteRows.push({ request_id, author, body, created_at });
  }

  console.log(`Inserting ${noteRows.length} notes…`);
  const { error: notesError } = await supabase.from('return_notes').insert(noteRows);
  if (notesError) throw notesError;

  const byStatus = {};
  const byReason = {};
  for (const r of inserted) {
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    byReason[r.reason] = (byReason[r.reason] || 0) + 1;
  }
  console.log('Seed complete.');
  console.log('By status:', byStatus);
  console.log('By reason:', byReason);
}

main().catch((err) => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
