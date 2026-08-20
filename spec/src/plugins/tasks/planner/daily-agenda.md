# Planner daily agenda

The Today surface is a controlled, selected-date agenda. It derives named views
and five day sections from Task summaries; selecting a date or changing a
section never writes a view name into YAML.

See LN-TASK-018 and LN-TASK-028–032.

## Named planner views

`matchesTaskView` in `src/lib/model/task-queries.ts` defines the named query
views. `classifyTask` in `src/lib/model/planner.ts` places a catalog Task into
one navigation bucket.

| View | Match |
| --- | --- |
| Inbox | Open task with `inbox: true` |
| Today | Open task whose plan date or deadline is today or earlier |
| Review | Open task whose plan date is before today |
| Upcoming | Open task with a future start, plan date, or deadline |
| Anytime | Open task with an actionable start and no plan date |
| Someday | Open task whose start is `someday` |
| Completed | Completed task only |
| Logbook | Completed or canceled task |

Upcoming day rows use the plan date, or the deadline when no plan exists. A
deadline-only task is not undated Anytime. An overdue plan remains in Review
until it is rescheduled, completed, skipped, or canceled.

Named query views may overlap: Review is an overdue subset of Today, for
example. The navigation bucket classifier applies its fixed priority only when
one catalog destination is required. Each planner destination renders its own
query result, heading, count, icon, and empty state; Inbox and Review never
fall through to the Logbook presentation.

## Selected date and week

The selected date defaults from the injected local clock. A Monday-first
seven-day strip supports previous and next week, distinguishes actual today
from the selected date, and updates presentation only. When the dates differ,
the Column Canvas header action returns to today.

The Today column header keeps its actions in navigation order: the conditional
Today shortcut, the Today actions menu, and the column collapse control at the
far right. The menu can hide completed rows for the current session, reopen all
tasks completed on the selected date, and hide overdue agenda rows. Reopening
all completed tasks clears their terminal completion state and preserves their
existing plan, so they return to the corresponding open day section.
The overdue action reads **Hide overdue tasks** while overdue rows are visible
and **Show overdue tasks** while they are hidden, so its label always describes
the action that selecting it will perform.

The compact selected weekday and uppercase month/year appear above the week
strip. The complete calendar header paints through the same inline overflow as
the task-row surfaces beneath it while preserving the planner's surrounding
content padding and scrollbar gutter. It stays sticky inside the planner scroll
viewport, so rows cannot show around its edges while scrolling.
Week controls are ghost buttons at rest; hover adds a semantic grey border
without an outline ring, while keyboard focus keeps its visible ring.

By default, the selected agenda includes every open task whose plan date or
deadline is on or before the selected date. The persisted `dailyAgenda.hideOverdueTasks`
setting limits that match to the selected date while leaving Review's overdue
query intact. A task remains visible when either its plan date or deadline
matches the selected date. Changing this setting only reclassifies the view and
never rewrites Task Markdown.

Tasks retains the Obsidian-compatible `PluginSettingTab` and also registers a
Tasks page with the public Lapis workspace settings controller. Both surfaces
edit the same versioned plugin data; the workspace shell is not expected to
render the legacy tab directly.

## Day sections

Every selected date renders these sections in order:

| Section | Routing rule | Initial disclosure | Color role |
| --- | --- | --- | --- |
| Anytime | `plan.at: anytime`, absent, or invalid | Expanded | Neutral |
| Morning | Explicit `morning`, or a clock before `afternoonStartsAt` | Expanded | Warning |
| Afternoon | Explicit `afternoon`, or a clock from `afternoonStartsAt` until `eveningStartsAt` | Expanded | Info |
| Evening | Explicit `evening`, legacy `when: this-evening`, or a clock from `eveningStartsAt` | Expanded | Accent |
| Done | Completed on the selected date | Collapsed | Success |

Explicit day parts do not depend on settings. Clock-valued tasks use the
configured boundaries, which default to `12:00` and `17:00`; each boundary
belongs to the section it starts. Missing or malformed settings migrate to
those defaults. Invalid task clock values remain readable and route to Anytime.
Changing the settings reclassifies clock-valued rows without rewriting Task
files.

Done uses the actual completion date and excludes canceled tasks. Rolling
recurring completion advances the open Task instead of creating a Done history
row. See [Rolling recurrence](../documents/recurrence.md).

Section headings keep their icon and label at the leading edge and put the
count next to the disclosure control at the trailing edge. Neutral, warning,
info, accent, and success tokens distinguish sections. Disclosure state stays
in memory across date changes; empty and collapsed sections remain valid drop
targets.

## When and At

`When` owns the date or undated bucket: Today, Tomorrow, a calendar date,
Anytime, or Someday. It does not contain Morning, Afternoon, or Evening.
Changing between dated values preserves `plan.at`; choosing Anytime or Someday
clears both the date and day part.

`At` writes `plan.at` as `anytime`, `morning`, `afternoon`, `evening`, or a
clock value. A clock remains visible until the user explicitly chooses a day
part. Legacy `when: this-evening` stays readable, while canonical section
routing is owned by `plan.at`.

Planner status choices write `task.status` as `open`, `completed`, or
`canceled`. The row checkbox toggles open and completed. Canceled tasks leave
Today and remain available through Logbook.

## Create and drag behavior

Quick-create in an open section writes the selected date and that section's
day part. Its collapsed row keeps a small gap after its divider so the first
Task card remains visually separate.

Dragging within or between open sections persists order, selected date, and
day part. Dropping into Done completes with the injected clock. Dragging out of
Done reopens the Task, writes the selected date, and assigns the destination
day part. Because Done uses actual completion dates, completing while viewing a
different date can remove the row.

The leading navigation column exposes the same planner drop-host data as the
App Shell sidebar. Dropping on a named bucket updates planning state; dropping
on a List creates or moves the structural membership link rather than storing a
List id on the child Task.
