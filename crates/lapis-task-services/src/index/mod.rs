mod envelopes;
mod links;
mod records;
mod targets;

pub use envelopes::{task_document_to_indexed_file, task_projection_source};
pub use links::task_edges;
pub use records::{
    TaskIndexEdge, TaskIndexedFile, TaskIndexedFileRecord, TaskIndexedLink, TaskIndexedMetadata,
    TaskIndexedSummary, TaskIndexedTag, TaskProjectionSource, TaskPublicationData,
    TaskPublicationRow,
};
pub use targets::{TaskStructureSnapshotResolver, resolve_task_href};

pub const TASKS_PUBLIC_PROJECTION_ID: &str = "tasks/task";
