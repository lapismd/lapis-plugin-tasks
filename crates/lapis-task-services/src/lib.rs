//! Source-owned, read-only Tasks algorithms for native Lapis hosts.
//!
//! Hosts own admission, indexing lifetime, projection registration and writes.
//! This crate derives disposable document and occurrence records from authored Markdown.

mod document;
mod marker;
mod occurrence;
mod record;
mod recurrence;

pub use document::{
    ChecklistItem, ParsedTaskDocument, StructuralLink, TaskDiagnostic, TaskDocumentKind,
    parse_task_document,
};
pub use occurrence::{is_canonical_daily_document, task_occurrence_projection_rows};
pub use record::{TaskOccurrenceRecord, TaskOutcome, TaskTrackingKind};
pub use recurrence::{
    EffectiveOccurrence, RecurrenceAnalysis, RecurrenceEngine, RecurrenceError, RecurrenceOptions,
    RepeatOptions, analyze_recurrence_rule, resolve_effective_occurrence,
};

pub const TASK_OCCURRENCE_PROJECTION_VERSION: u32 = 1;
