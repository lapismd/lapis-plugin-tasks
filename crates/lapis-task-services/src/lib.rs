//! Source-owned, read-only Tasks algorithms for native Lapis hosts.
//!
//! Hosts own admission, indexing lifetime, projection registration and writes.
//! This crate derives disposable document and occurrence records from authored Markdown.

mod document;
mod marker;
mod occurrence;
mod projection;
mod record;
mod recurrence;
mod structure;

pub use document::{
    ChecklistItem, ParsedTaskDocument, StructuralLink, TaskDiagnostic, TaskDocumentKind,
    parse_task_document,
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
    task_structure_for_projection,
};
