UPDATE "concession_combos"
SET
  "name" = 'My Combo',
  "description" = '1 bắp rang cỡ lớn và 1 nước ngọt.',
  "price" = 95000,
  "imageUrl" = '/assets/images/combos/my_combo.jpg'
WHERE "name" IN ('Combo Solo', 'My Combo');

UPDATE "concession_combos"
SET
  "name" = 'Double Combo',
  "description" = '1 bắp rang cỡ lớn và 2 nước ngọt.',
  "price" = 115000,
  "imageUrl" = '/assets/images/combos/double_combo.jpg'
WHERE "name" IN ('Combo Couple', 'Double Combo');

UPDATE "concession_combos"
SET
  "name" = 'Hattrick Combo',
  "description" = '1 bắp rang, 1 nước ngọt và 1 phần nachos phô mai.',
  "price" = 135000,
  "imageUrl" = '/assets/images/combos/hattrick_combo.jpg'
WHERE "name" IN ('Nuoc Ngot', 'Nước Ngọt', 'Hattrick Combo');

UPDATE "concession_combos"
SET
  "name" = 'Poker Combo',
  "description" = '2 bắp rang, 2 nước ngọt và 1 phần nachos phô mai.',
  "price" = 230000,
  "imageUrl" = '/assets/images/combos/poker_combo.jpg'
WHERE "name" IN ('Combo Family', 'Poker Combo');
