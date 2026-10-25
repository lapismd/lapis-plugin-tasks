mod records;
mod resolution;
mod scanner;
mod source;

pub use records::{
    HeadingContext, IndexedTaskRun, ResolvedTaskDocumentStructure, ScannedChecklistItem,
    ScannedTaskStructure, StructuralEntry, StructuralEntryCandidate, TaskRun,
    TaskStructureDiagnostic, TaskStructureOptions, TaskStructureProjection, TaskStructureTarget,
};
pub use resolution::{resolve_task_document_structure, task_structure_for_projection};
pub use scanner::{scan_task_headings, scan_task_structure};
