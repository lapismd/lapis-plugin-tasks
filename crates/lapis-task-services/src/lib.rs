//! Source-owned, read-only Tasks algorithms for native Lapis hosts.
//!
//! Hosts own admission, indexing lifetime, projection registration and writes.
//! This crate only derives disposable occurrence records from authored Markdown.

mod marker;
mod occurrence;
mod record;

pub use occurrence::{is_canonical_daily_document, task_occurrence_projection_rows};
pub use record::{TaskOccurrenceRecord, TaskOutcome, TaskTrackingKind};

pub const TASK_OCCURRENCE_PROJECTION_VERSION: u32 = 1;
