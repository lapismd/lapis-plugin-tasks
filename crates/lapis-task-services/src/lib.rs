//! Source-owned Tasks algorithms for native Lapis hosts.
//!
//! Hosts own admission, indexing lifetime, projection registration and writes.
//! This crate derives records and replacement Markdown from explicit authored values.

mod document;
mod index;
mod marker;
mod occurrence;
mod projection;
mod record;
mod recurrence;
mod structure;
mod transform;

pub use transform::{
    TaskDayPartSettings, TaskLifecycleAction, TaskLifecycleObservation, TaskLifecyclePlan,
    TaskMutation, TaskOccurrenceCompletion, TaskOccurrenceDayPart, TaskOccurrenceMaterialization,
    TaskOccurrenceObservation, TaskPauseRange, TaskPlan, TaskPlanAt, TaskRepeat, TaskRepeatAnchor,
    TaskRepeatMissed, TaskStart, TaskTracking, TaskTransformError, apply_task_mutation,
    complete_task_occurrence, materialize_task_occurrence, plan_task_lifecycle,
    scan_task_occurrence_observations, task_occurrence_day_part, tracking_completion,
};

pub use document::{
    ChecklistItem, ParsedTaskDocument, StructuralLink, TaskDiagnostic, TaskDocumentKind,
    parse_task_document,
};
pub use index::{
    TASKS_PUBLIC_PROJECTION_ID, TaskIndexEdge, TaskIndexedFile, TaskIndexedFileRecord,
    TaskIndexedLink, TaskIndexedMetadata, TaskIndexedSummary, TaskIndexedTag, TaskProjectionSource,
    TaskPublicationData, TaskPublicationRow, TaskStructureSnapshotResolver, resolve_task_href,
    task_document_to_indexed_file, task_edges, task_projection_source,
};
pub use occurrence::{is_canonical_daily_document, task_occurrence_projection_rows};
pub use projection::{TASK_PROJECTION_VERSION, TaskProjectionRecord, project_task};
pub use record::{TaskOccurrenceRecord, TaskOutcome, TaskTrackingKind};
pub use recurrence::{
    EffectiveOccurrence, RecurrenceAnalysis, RecurrenceEngine, RecurrenceError, RecurrenceOptions,
    RepeatOptions, analyze_recurrence_rule, resolve_effective_occurrence,
};

pub const TASK_OCCURRENCE_PROJECTION_VERSION: u32 = 1;

pub use structure::{
    HeadingContext, IndexedTaskRun, ResolvedTaskDocumentStructure, ScannedChecklistItem,
    ScannedTaskStructure, StructuralEntry, StructuralEntryCandidate, TaskRun,
    TaskStructureDiagnostic, TaskStructureOptions, TaskStructureProjection, TaskStructureTarget,
    resolve_task_document_structure, scan_task_headings, scan_task_structure,
    task_structure_for_projection, validate_task_structure_graph,
};
