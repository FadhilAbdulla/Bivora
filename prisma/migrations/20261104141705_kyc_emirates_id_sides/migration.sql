-- Emirates ID now has front and back slots; an earlier single upload becomes the front.
UPDATE "KycDocument" SET "slot" = 'FRONT' WHERE "type" = 'EMIRATES_ID' AND "slot" = 'MAIN';
