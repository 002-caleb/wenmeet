-- Public participant links (/m/:token).
--
-- Added nullable first, backfilled, then constrained: the meetings table
-- may already hold rows from earlier deploys, and adding a NOT NULL UNIQUE
-- column in one step would fail against them.

alter table meetings add column if not exists share_token text;

-- Backfill rows created before share links existed. md5() is core Postgres
-- (no pgcrypto, which this project deliberately avoids), and hashing the
-- row's own uuid guarantees distinct values. '0' and '1' are mapped away to
-- match the application alphabet, which drops look-alike characters.
-- New rows get their token from the application CSPRNG instead — see
-- src/lib/shareToken.ts.
update meetings
   set share_token = translate(substr(md5(id::text), 1, 12), '01', 'qr')
 where share_token is null;

alter table meetings alter column share_token set not null;

create unique index if not exists meetings_share_token_key on meetings (share_token);
