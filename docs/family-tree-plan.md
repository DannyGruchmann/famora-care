# Family tree — rebuild plan

Written 2026-08-28. Replaces the first attempt (commit `98eb997`, "add famaly tree v1"), which is
reverted in full by phase 0.

This file exists so the plan survives the chat it was made in. Every decision below was made
explicitly; a later session should follow it rather than re-open it.

---

## 1. Why the first version is thrown away

Three reasons, all structural rather than cosmetic:

1. It was built into the existing **Familie** section and shared that section's `helpers` — the
   people you hand checklist tasks to. The tree is supposed to hold its own people.
2. It hung off the folder and therefore off the precaution/folder logic. It has its own logic.
3. It was egocentric: every person related to _one_ centre, no edges between third parties. That
   cannot express great-grandparents or great-great-grandchildren, which is the actual requirement.

The look followed from (3): with no real edges there is nothing to draw but centred rows with
dashes, which is what it looked like.

---

## 2. Decisions

Made with the product owner. Do not re-litigate these; if one turns out to be wrong, note it here
with a date rather than quietly changing course.

### Teardown

| Question                              | Decision                                                                                                     |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| How much of `98eb997` is reverted     | **All of it.** No part of the tree work survives.                                                            |
| `auth-layout.component.scss`          | **Kept** — desktop breakpoints, unrelated to the tree.                                                       |
| `Helper.relation` / `Helper.deceased` | **Reverted.** `Helper` goes back to `{ id, name }`.                                                          |
| Emergency sheet                       | Back to the flat name list. Whether the new tree belongs on paper is a separate decision, taken later.       |
| Printing                              | **Not a requirement.** The tree never has to fit A4. This removes the constraint that shaped the old design. |

### Data model

| Question              | Decision                                                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Relationship model    | Parent-child edges plus partner edges. Up to two parents per person. Half-siblings and second marriages fall out of the model; no union/GEDCOM `FAM` node. |
| Adoption / step edges | Not in phase 1. The edge table carries a `kind` column, so a third kind is a data change, not a schema change.                                             |
| Ownership             | Own table `family_trees`, independent of `folders`. A tree outlives a folder and can be shared; a folder cannot.                                           |
| Person fields         | `name`, `birth_year`, `deceased`, `death_year`. Nothing else.                                                                                              |
| Deliberately excluded | Photo, full date of birth, free-text note, contact details, address, place of birth, gender. See §7.                                                       |
| Depth                 | Unbounded. Great-grandparents up, great-great-great-grandchildren down.                                                                                    |

### Presentation

| Question                 | Decision                                                                                                                                                                                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Layout engine            | **Own implementation**, behind `layoutTree(persons, relations, focusId) → { nodes, connectors, size }`.                                                                                                                                                              |
| Why not `relatives-tree` | ~3.2 kB and a proven algorithm, but `gender` is a required field in its data format. We deliberately do not collect it, and feeding it a dummy value is dishonest code. Kept as the escape hatch: its output shape is the signature above, so only one file changes. |
| Why not `family-chart`   | Brings d3, brings its own rendering — and the look is exactly what we are rebuilding. Growth features (kinship engine, filtering, performance) sit behind a paid tier.                                                                                               |
| Why not `d3-hierarchy`   | Lays out trees, where a node has one parent. A family tree with two parents is a DAG. Half the work stays with us.                                                                                                                                                   |
| Why not `elkjs`          | ~500 kB of transpiled Java for thirty people.                                                                                                                                                                                                                        |
| Navigation               | **Pan-and-zoom canvas.** Chosen against the recommendation (focus-person navigation), knowingly. Mitigations are mandatory — see §5.3.                                                                                                                               |
| Rendering                | HTML cards, SVG connectors behind them. Keeps design tokens, focus rings, text selection and screen-reader text; SVG only draws lines.                                                                                                                               |
| Editing                  | **In the tree.** Tapping a card opens a panel with the fields and three buttons: add parent, add partner, add child. The relationship comes from where you tapped — nobody has to read the word "relationship".                                                      |
| Root person              | The tree stores a root person it opens on. The viewer is not linked to a person in phase 1.                                                                                                                                                                          |
| Place in the app         | A summary field in the folder dashboard linking to a full-screen route `/stammbaum/:treeId`.                                                                                                                                                                         |

### Helpers and tree people

The **Familie** section stays and keeps managing helpers for task assignment. A helper may
_optionally_ point at a tree person.

- Not every helper is family — the neighbour with the spare key, the notary. Free-typed names stay
  possible and are the default path.
- Adding a helper never creates a tree person.
- The link points one way only: the private folder knows the tree, the shared tree learns nothing
  about anybody's folders, tasks or progress.
- `Helper` gains one optional field: `treePersonId?: string`. The name is still stored on the
  helper, so a folder keeps working when the tree is gone.

### Sharing

| Question                    | Decision                                                                                                                        |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Roles                       | `owner`, `editor`, `viewer`. Editors create, change and delete people. Only owners invite, hand out roles and delete the tree.  |
| Multiple owners             | **Allowed.** Ownership is transferable.                                                                                         |
| Invitation                  | **Link with a secret token**, passed on by the owner personally. No e-mail, no Edge Function, no additional processor.          |
| Token lifetime              | 7 days, single use, revocable at any time.                                                                                      |
| Visibility                  | Everyone in the tree sees the whole tree. No hidden branches.                                                                   |
| Concurrent edits            | Last write wins, **per person row**. Two people editing different relatives never collide.                                      |
| Removing a member           | Their access goes, what they entered stays. People belong to the tree, not to whoever typed them.                               |
| Owner deletes their account | Their membership row goes. If an owner remains, the tree carries on under them. If the last owner is gone, the tree is deleted. |

### Legal

| Question         | Decision                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Controller model | Single controller (DGLabs, later the planned UG). Third-party data on Art. 6 Abs. 1 lit. f DSGVO with a documented balancing test. |
| In-app notice    | A quiet one-off line when a tree is first created and again when an invitation link is generated. No checkbox, no modal wall.      |
| DPIA             | No full DSFA. A documented threshold assessment (Schwellwertanalyse) in the repo, in German.                                       |

---

## 3. Phase 0 — teardown

Done on 2026-08-29. Recorded here because it turned out to be more than a plain revert.

```
git revert --no-commit 98eb997
git checkout 98eb997 -- src/app/features/auth/auth-layout/auth-layout.component.scss
```

The revert conflicted, because two commits landed on top of `98eb997` after it:
`2f1496f` (Turnstile, untouched by the revert) and `e40e6d5`, which reworked the helper section
inside the very folder the revert deletes. Conflicts were resolved to the pre-tree state, and
`src/app/features/family/` was removed in full.

**What was rescued from `e40e6d5`.** Helpers stay editable in place — that feature is independent of
the tree and phase 3 depends on it: `renameHelper` keeps the id, which is what will later let a
helper gain a `treePersonId` without losing their task assignments. Rescued and adapted to
`Helper = { id, name }`:

- `dashboard/helper-form/` — one field now, not three. Uses `linkedSignal` to follow its input, and
  clears itself on submit in 'add' mode. The old version passed a fresh draft object each time to
  force a reset; with a plain string that trick does not work, and self-clearing is simpler anyway.
- `dashboard/helper-row/` — name and workload, no relation.
- `dashboard/family-section/` — list, edit-in-place, add form. No tree.
- `DashboardStore.updateHelper(id, draft)` became `renameHelper(id, name)`. The extracted
  `dropAssignmentsOf` went back inline into `removeHelper`, its only remaining caller.

Verified: `features/family/` gone · `Helper` is `{ id, name }` in `dashboard.types.ts` ·
no source reference to `familyTree`, `HelperDraft`, `deceased` or `features/family` remains ·
emergency sheet shows "Diese Menschen wissen Bescheid" as a flat list ·
`auth-layout.component.scss` byte-identical to `98eb997`, all four `$bp-lg` blocks present.

Gate: `ng lint` clean · 142 tests in 22 files green · `ng build` clean · Prettier clean.

---

## 4. Phase 1 — data model

New file `supabase/family-tree.sql`, written in the style of `supabase/folder-entries.sql`:
heavily commented, repeatable, RLS plus policies, a checks section at the end. Run by hand in the
Supabase SQL editor. Requires `schema.sql` first (it reuses `public.set_updated_at()`).

### Tables

**`family_trees`** — `id`, `name`, `root_person_id` (nullable, set once the first person exists),
`created_at`, `updated_at`.

No `owner_id` column. Ownership lives only in `tree_members`, because it is transferable and there
can be more than one owner. A copy on the tree would be a second truth.

**`tree_persons`** — `id`, `tree_id`, `name`, `birth_year`, `deceased`, `death_year`, `created_by`,
`created_at`, `updated_at`.

- `birth_year` / `death_year` are `smallint`, nullable, constrained to a sane range (1000 … current
  year + 1). Not dates — see §7.
- `created_by uuid references auth.users on delete set null`. Kept for the Art. 15 case: if a third
  party asks where an entry came from, there has to be an answer. `set null`, not `cascade` — a
  deleted account must not take other people's tree entries with it.
- `unique (tree_id, id)` — needed for the composite foreign key below.

**`tree_relations`** — `id`, `tree_id`, `kind`, `person_a`, `person_b`, `created_at`.

One table with a `kind` column, same reasoning as `folder_entries`: the kinds differ in meaning,
not in shape, and five tables mean five sets of policies to keep in sync.

- `kind in ('parent', 'partner')`. For `parent`: `person_a` is the parent, `person_b` the child.
  For `partner` the edge is undirected, so a check constraint forces `person_a < person_b` and a
  unique index then actually prevents duplicates.
- `check (person_a <> person_b)`.
- `unique (tree_id, kind, person_a, person_b)`.
- Both people must sit in the same tree. Enforced structurally, not by trigger:
  `foreign key (tree_id, person_a) references tree_persons (tree_id, id) on delete cascade`, and the
  same for `person_b`. Deleting a person therefore takes their edges with them.
- "At most two parents" needs a `before insert` trigger — it cannot be a constraint. Worth writing:
  this schema's own stated position (schema.sql §5) is that the application forgets and the database
  does not.

**`tree_members`** — `tree_id`, `user_id`, `role`, `created_at`. Primary key `(tree_id, user_id)`.

- `role in ('owner', 'editor', 'viewer')`.
- `user_id references auth.users on delete cascade` — deleting an account removes the membership,
  which is what drives the owner-deletion rule below.

**`tree_invitations`** — `id`, `tree_id`, `token_hash`, `role`, `created_by`, `expires_at`,
`accepted_at`, `accepted_by`, `revoked_at`, `created_at`.

- **The raw token is never stored.** Only `sha256(token)`. The token itself exists in the link and
  nowhere else. Needs `pgcrypto` (available on Supabase).
- `role` is fixed at invitation time, so the owner decides what the link is worth before it leaves
  their hands.

### Access control

The trap the brief names is real: a policy **on** `tree_members` that reads `tree_members` is
infinite recursion in Postgres. `public.owns_folder()` gets away with being plain `stable` because
`folders`' own policy is `auth.uid() = user_id` and does not recurse. Here that does not hold.

So these helpers are **`security definer`**, `stable`, `set search_path = ''`, and they exist for
exactly that reason — the comment in the SQL file has to say so, or someone will "simplify" it back
into a recursion:

```sql
public.tree_role(target uuid) returns text     -- the caller's role, or null
public.can_view_tree(target uuid)              -- role is not null
public.can_edit_tree(target uuid)              -- role in ('owner', 'editor')
public.is_tree_owner(target uuid)              -- role = 'owner'
```

`security definer` bypasses RLS by design, so each function must do nothing but look up
`(target, auth.uid())` and return. No joins, no parameters that let a caller ask a wider question.

Policies:

| Table              | select                   | insert / update / delete                                                                                         |
| ------------------ | ------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| `family_trees`     | `can_view_tree(id)`      | insert: any signed-in user (creating a tree makes you its owner via trigger). update/delete: `is_tree_owner(id)` |
| `tree_persons`     | `can_view_tree(tree_id)` | `can_edit_tree(tree_id)`                                                                                         |
| `tree_relations`   | `can_view_tree(tree_id)` | `can_edit_tree(tree_id)`                                                                                         |
| `tree_members`     | `can_view_tree(tree_id)` | `is_tree_owner(tree_id)`; plus: a member may delete **their own** row (leaving a tree)                           |
| `tree_invitations` | `is_tree_owner(tree_id)` | `is_tree_owner(tree_id)`                                                                                         |

Redeeming an invitation cannot go through those policies — the invitee is not a member yet and must
not be able to read the invitations table. It runs through one RPC:

```sql
public.accept_tree_invitation(token text) returns uuid   -- security definer
```

It hashes the token, finds a row that is not expired, not revoked and not yet accepted, inserts the
membership, stamps `accepted_at` / `accepted_by`, and returns the tree id. Anything else raises. It
is the only way in.

### Owner deletion

One trigger, and the requirement falls out:

```
after delete on tree_members:
  if no row with role = 'owner' remains for that tree, delete the tree.
```

Deleting an account cascades away its membership rows, which fires this. Ownership handed over
beforehand means an owner remains and the tree survives under them. Last owner gone means the tree
goes. Exactly the agreed behaviour, in six lines of plpgsql.

### Application layer

- Regenerate `src/app/lib/database.types.ts` after running the SQL.
- `src/app/features/family-tree/tree.types.ts` — `TreePerson`, `TreeRelation`, `TreeRole`,
  `TreeMember`, `TreeInvitation`, drafts.
- `src/app/features/family-tree/tree.queries.ts` — `ApiResult<T>` and `runQuery` from
  `src/app/lib/supabase-query.ts`, exactly like `entries.queries.ts`.
- `src/app/features/family-tree/family-tree.store.ts` — route-scoped, provided by the page, not in
  root. Writes per change like `EntriesStore`, not whole-object like `DashboardStore` — that is what
  makes "last write wins per person" true.

---

## 5. Phase 2 — layout and canvas

### 5.1 The layout function

`src/app/features/family-tree/tree.layout.ts`

```ts
layoutTree(persons, relations, focusId) → { nodes, connectors, size }
```

Pure, no Angular, no DOM. This is the piece that gets real test coverage.

1. **Generations.** Breadth-first from the focus person: parent is `gen - 1`, child is `gen + 1`,
   partner is the same generation. Every unvisited person starts a new sweep at `gen 0`, so a
   disconnected branch still lands somewhere instead of vanishing.
2. **Rows.** Group by generation, normalise so the topmost row is 0.
3. **Order within a row.** Partners adjacent. Sibling groups stay together. A child sits under the
   midpoint of its parents.
4. **Horizontal position.** Two sweeps, repeated a small fixed number of times: top-down (children
   centred under their parents), then bottom-up (parents centred over their children), then a single
   left-to-right pass that pushes overlapping cards apart. Fixed iteration count, so it terminates
   whatever the data does.
5. **Connectors.** Orthogonal only, never diagonal — that is what reads as genealogy. A couple gets
   a short bar between the two cards; shared children drop from the bar's midpoint. A single parent
   drops from the bottom edge of their own card.

Keep functions at or under ~14 lines and split the file if it approaches 400. Likely split:
`tree.generations.ts` (steps 1–2) and `tree.layout.ts` (steps 3–5).

**Tests** (`tree.layout.spec.ts`) — these are the ones that matter:

- two parents, one child: the child sits centred between them
- half-siblings: one shared parent, one different, both children in the same row, no overlap
- a partner with no children still shares the row
- a person with no connection to the focus still gets a position
- a cycle in the data (someone is their own ancestor by mistake) terminates instead of hanging
- six generations deep produce six rows

### 5.2 Components

Feature folder `src/app/features/family-tree/`. One component per folder, kebab-case file names,
no barrel files.

```
family-tree/
  tree.types.ts
  tree.queries.ts
  tree.layout.ts            + tree.layout.spec.ts
  tree.generations.ts       + tree.generations.spec.ts
  family-tree.store.ts      + family-tree.store.spec.ts   route-scoped, one tree
  my-trees.service.ts                                     root-level: which trees this account has
  family-tree-page/         full-screen route, provides the store
  tree-canvas/              pan/zoom surface, renders cards + SVG connectors
  person-card/              one person
  person-panel/             edit + "add parent / partner / child"
  tree-summary-card/        the field in the folder dashboard, see 5.5
```

Two stores on purpose. `family-tree.store.ts` is provided by the page and belongs to one tree, like
`EntriesStore`. `my-trees.service.ts` is `providedIn: 'root'` because the dashboard card needs to
know whether a tree exists at all, and that question is account-wide — putting it in
`DashboardStore` would tie an account-level object to one folder.

Sharing UI (`tree-members-panel/`, `invite-dialog/`) arrives in phase 4.

### 5.3 Canvas behaviour — the mitigations

Pan-and-zoom was chosen over guided navigation. That decision only holds if none of the following
is skipped:

- **Real buttons for everything.** Zoom in, zoom out, "Alles zeigen", "Zur Startperson" as
  `icon-button`s bottom right. Nobody is ever forced to pinch. This is the whole mitigation.
- **The canvas pans inside itself.** A fixed-height viewport with `overflow: hidden` and a
  transformed inner surface. The page itself never scrolls horizontally — the 320 px rule stays
  intact because the tree is not what makes the page wide.
- **Keyboard.** Arrow keys pan, `+` / `-` zoom, `0` resets. Cards are focusable and reachable by
  Tab in reading order (generation by generation), so the tree is operable without a mouse.
- **Zoom bounds**, roughly 0.4 to 2. Below that cards are unreadable; above it there is no point.
- **Opens sensibly.** On load: the root person centred at a zoom that fits their parents, partner
  and children. Not "fit everything", which on a six-generation tree means unreadable dust.
- **A dot grid** at very low opacity on the canvas ground. It is the affordance that says "this
  surface moves" without a word of instruction.
- **Screen readers get the list.** The canvas is `aria-hidden`; next to it, visually hidden, an
  ordered list of generations with names, years and relationships. This is the standard answer for
  complex diagrams and it costs almost nothing here — the data is already grouped by generation.

### 5.4 Design direction

Per `design-privat`, but held to the audience: people in their mid-fifties, often recently bereaved.
The ambition goes into the craft, not the show.

- **Cards, not rows.** `--color-surface`, 1 px `--color-line`, `--radius-xl`, `--shadow-sm`. Name in
  `--font-heading`, years in `--font-body` and `--color-ink-muted`.
- **Dead people are not greyed out.** The old version stamped "verstorben" under the name. With a
  death year present, `1932–2019` says it better and shorter. A thin left border in
  `--color-ink-soft` carries it visually. Legibility never drops.
- **Connectors** 1.5 px in `--color-line-strong`, orthogonal, 8 px corner radii. Behind the cards,
  never over them.
- **The root person** gets a 2 px ring in `--color-primary`, not a filled background. The old
  version filled it, which made it read as a pressed button.
- **The folder palette applies.** Anything using `var(--color-primary)` follows `prepare-palette`
  automatically. Do not hard-code the green.
- No dark theme, no parallax, no motion beyond a short ease on pan and zoom.

CSP in `nginx.conf` is unaffected: no library, no external asset, no font beyond the two already
self-hosted.

### 5.5 The way in

The first version had no entry point of its own — it was simply drawn inside the **Familie**
section. This one needs a real one, and it has to work on day one, when no tree exists yet.

**In the folder dashboard**, a `famora-section-card` like the others, heading "Stammbaum". It shows
one of two things:

- **No tree yet.** One sentence explaining what this is for, and a single button "Stammbaum
  anlegen". Nothing else — no empty canvas, no placeholder diagram.
- **A tree exists.** A summary line ("14 Personen, 4 Generationen") and a button "Stammbaum öffnen"
  leading to the full-screen route.

`SectionCard` currently accepts `icon: 'checklist' | 'documents' | 'family' | 'register'`. It needs
a fifth value for the tree, added to the union and to the `@switch` in its template — a lucide
`network` or `git-fork` reads as a tree without looking like the "Familie" people icon.

**Creating the first tree** happens in one step, not a wizard: pressing the button inserts a
`family_trees` row, makes the caller its owner, and navigates to `/stammbaum/:treeId`. The tree then
opens empty with a single prompt to add the first person, who becomes `root_person_id`. Asking for a
tree name up front is a form standing between somebody and the thing they wanted; the name can be
edited later and defaults to something derived from the account.

**Ownership is on the account, the entry point is in the folder.** That combination needs one
lookup: "does this user own or belong to any tree?" A user with several folders sees the same tree
card in each of them, which is correct — there is one tree, reachable from wherever you are. Load it
in a small root-level service rather than in `DashboardStore`, which is deliberately scoped to one
folder and must not learn about account-wide objects.

**Route** `/stammbaum/:treeId` behind `requireAuthGuard`, added to `ROUTES` in
`src/app/routes.constants.ts` with a `treePath(treeId)` helper alongside `folderPath` and
`emergencySheetPath`. A tree id that belongs to nobody the caller knows returns nothing through RLS,
which the page treats the way `DashboardStore` treats a missing folder: no explanation, just back to
somewhere sensible.

---

## 6. Phases 3 to 5

**Phase 3 — helper link.** `Helper` gains `treePersonId?: string`. The Familie section gets a picker
"Person aus dem Stammbaum" next to the free-text name field. The list marks which helpers are tree
people. `folders.queries.ts` reads the new field tolerantly, the way it already handles folders
written before a field existed.

**Phase 4 — sharing.** `tree-members-panel` (list, role changes, removal), `invite-dialog` (generate
link, copy, revoke, show what is outstanding), a redemption route that calls
`accept_tree_invitation` and drops the user into the tree. Role checks live in one pure module,
`tree.permissions.ts`, with its own spec — the brief is right that permission logic belongs in tests.
The UI must never be the only thing enforcing a role; RLS is the enforcement, the UI is the courtesy.

Turnstile note: an invitee without an account goes through registration, which is behind Cloudflare
Turnstile. That currently fails on `localhost` because the host is not in the widget's Hostname
Management. Add it in the Cloudflare dashboard before testing this phase end to end.

**Phase 5 — legal.** Three deliverables, in German:

1. `docs/schwellwertanalyse-stammbaum.md` — the nine WP248 criteria, which one applies (data about
   people who cannot practically exercise their rights), the conclusion that no full DSFA is
   required, and the reasoning. Art. 5 Abs. 2 accountability.
2. Privacy policy additions in `privacy-page.component.html`:
   - a new section on the tree and on sharing: what is stored, that it is data about third parties,
     Art. 6 Abs. 1 lit. f as the basis, recipients being the members the user invites, retention
     (until deleted; invitations 7 days), and the **Art. 21 right to object**, which is mandatory
     once lit. f is in play.
   - **Fix an existing error.** The page currently says "Ihre Daten werden nicht verkauft und nicht
     weitergegeben." The first shared tree makes that untrue. It has to be reworded before the
     feature ships, not after.
3. One line for the processing register (Verarbeitungsverzeichnis) covering the tree and its sharing.

The in-app notice: one sentence when a tree is first created, one when an invitation link is
generated. No checkbox.

---

## 7. Fields that are deliberately absent

Each of these was considered and rejected. Adding any of them reopens the legal assessment.

| Field              | Why not                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Photo              | Storage with its own policies, uploads about third parties, face images of people who never consented. The single most expensive item on the list.             |
| Full date of birth | Name plus date of birth is the classic identity-theft pair. Birth year sorts generations just as well. Art. 5 Abs. 1 lit. c.                                   |
| Free-text note     | The channel through which Art. 9 data arrives uninvited — cause of death, religion, illness. There is no way to stop it once the field exists.                 |
| Contact details    | The Art. 14 Abs. 5 lit. b argument (informing the third party is a disproportionate effort) rests on having no way to reach them. An e-mail field destroys it. |
| Gender             | Only `relatives-tree` wanted it, and we are not using `relatives-tree`.                                                                                        |
| Maiden name        | Genuinely useful in genealogy and not especially sensitive. Left out of phase 1 for scope, not for risk — a reasonable early addition.                         |

---

## 8. Known risks

- **The horizontal layout pass is the hard part.** Converging branches (cousins marrying, a child
  with parents from two distant parts of the tree) are where a hand-written layout goes wrong. The
  escape hatch is `relatives-tree`, and `layoutTree()` is shaped to make swapping it a one-file
  change. If the second sweep is still fighting overlaps after a day, take the hatch.
- **Pan-and-zoom on 320 px** remains the weakest point of the chosen design. If it tests badly with
  a real user, the fallback is focus-person navigation on small screens — the layout function does
  not change, only which subset of nodes is rendered.
- **`security definer` is a loaded gun.** Those four functions bypass RLS. They must stay trivial,
  parameterised only by tree id, and reviewed as carefully as the policies themselves.
- **Scope.** Phases 1–2 and phase 4 are each a session's worth of work. Do not attempt sharing in
  the same sitting as the layout engine.

---

## 9. Definition of done, per phase

`npm run lint`, `npm test`, `npm run build`, `npx prettier --check .`, plus the pre-phase checklist
from the `coding-standards` skill. Claude never runs `git add`, `git commit` or `git push`.
