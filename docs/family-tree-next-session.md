# Family tree — kickoff for the next session

Hand this to a fresh chat together with `docs/family-tree-plan.md`. The plan holds the decisions and
the reasoning; this file holds only what the next session needs in order to start without asking
anything twice.

---

## Paste this as the first message

> Wir bauen den Stammbaum für Famora neu. Der vollständige Plan liegt in
> `docs/family-tree-plan.md` — lies ihn zuerst und vollständig, er enthält alle Entscheidungen,
> die ich in einer langen Frage-Runde schon getroffen habe. Stell diese Fragen nicht noch einmal.
>
> Der Rückbau der alten Version ist erledigt und committet. Wir starten bei Phase 1: Datenmodell
> und SQL, danach Phase 2 mit Layout und Leinwand.
>
> Es gelten die Skills `coding-standards` (verbindlich) und `design-privat`. Deutsch antworten,
> keine Emojis, Code und Kommentare auf Englisch. **Niemals committen oder pushen — git add,
> commit und push mache ausschließlich ich.**
>
> Fang mit Phase 1 an: `supabase/family-tree.sql` nach dem Muster von `supabase/folder-entries.sql`.
> Ich führe das SQL selbst im Supabase-Dashboard aus.

---

## State of the repo

Reverted and committed: commit `98eb997` ("add famaly tree v1") is undone. `src/app/features/family/`
no longer exists. `Helper` is `{ id, name }` in `dashboard.types.ts`. The emergency sheet shows a
flat name list again.

Kept deliberately, do not remove:

- `auth-layout.component.scss` — the desktop `$bp-lg` breakpoints from `98eb997`.
- Helper editing, rescued from `e40e6d5` and adapted: `dashboard/helper-form/`,
  `dashboard/helper-row/`, `dashboard/family-section/`, and `DashboardStore.renameHelper`.
  Phase 3 builds on `renameHelper` — the id survives an edit, which is what will later let a helper
  gain a `treePersonId` without losing their task assignments.

Gate at handover: `ng lint` clean, 142 tests in 22 files green, `ng build` clean, Prettier clean.

## Where to start reading

| For                                          | Read                                                                           |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| SQL style, RLS, policies, the checks section | `supabase/folder-entries.sql`                                                  |
| The RLS recursion trap and its fix           | plan §4 "Access control" — `owns_folder` is **not** the pattern to copy here   |
| Route-scoped store writing per change        | `src/app/features/entries/entries.store.ts`                                    |
| Queries with `ApiResult<T>`                  | `src/app/features/entries/entries.queries.ts`, `src/app/lib/supabase-query.ts` |
| Add/edit through one switching form          | `src/app/features/entries/entry-section/`, and now `dashboard/helper-form/`    |
| Collapsible dashboard section                | `src/app/features/dashboard/section-card/`                                     |
| Design tokens and mixins                     | `src/styles/_tokens.scss`, `src/styles/_mixins.scss`                           |
| Route constants and path helpers             | `src/app/routes.constants.ts`                                                  |

## Phase 1 — the concrete first task

Write `supabase/family-tree.sql`. Everything it must contain is in plan §4. The four things most
easily got wrong:

1. **No `owner_id` on `family_trees`.** Ownership lives only in `tree_members`, because it is
   transferable and there can be more than one owner.
2. **The RLS helpers must be `security definer`.** A policy on `tree_members` that reads
   `tree_members` is infinite recursion. `owns_folder()` gets away with plain `stable` only because
   `folders`' own policy does not recurse. Write the reason into the SQL comment, or someone will
   "simplify" it back.
3. **Same-tree integrity through a composite foreign key**, not a trigger:
   `tree_persons` gets `unique (tree_id, id)`, and `tree_relations` references
   `(tree_id, person_a)` and `(tree_id, person_b)`.
4. **Invitation tokens are stored only as `sha256(token)`.** The raw token exists in the link and
   nowhere else. Redemption goes through the `accept_tree_invitation(token)` RPC, never through a
   policy — the invitee is not a member yet and must not be able to read the table.

After the SQL runs, regenerate `src/app/lib/database.types.ts`.

## Things that are decided — do not reopen

Person fields are `name`, `birth_year`, `deceased`, `death_year`. No photo, no full date of birth,
**no free-text note**, no contact details, no gender. Plan §7 says why for each; every one of them
reopens the legal assessment.

Navigation is a pan-and-zoom canvas. This was chosen against the recommendation, knowingly. The
mitigations in plan §5.3 are not optional — especially real zoom buttons, so nobody is forced to
pinch, and the hidden generation list for screen readers.

Layout is built in-house behind `layoutTree(persons, relations, focusId)`. `relatives-tree` is the
escape hatch if the horizontal pass fights back; that is why the signature matches its output shape.

## Not code, but part of the job

Phase 5 carries three German-language deliverables (plan §6). One of them is a correction, not an
addition: `privacy-page.component.html` currently states "Ihre Daten werden nicht verkauft und
**nicht weitergegeben**". The first shared tree makes that untrue, and it has to be reworded before
the feature ships.

## Open, for Danny

- Turnstile: `localhost` still needs adding to the widget's Hostname Management in the Cloudflare
  dashboard, or an invitee's registration cannot be tested end to end locally.
- The planned UG replaces the controller named in `legal.data.ts` once it exists. Until then the
  controller is Danny personally.
