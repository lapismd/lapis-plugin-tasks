use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum TaskStart {
    Anytime,
    Someday,
    Date { date: String },
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TaskPlanAt {
    Anytime,
    Morning,
    Afternoon,
    Evening,
    Time,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskPlan {
    pub date: String,
    pub at: TaskPlanAt,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_minutes: Option<f64>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TaskRepeatAnchor {
    Schedule,
    Completion,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TaskRepeatMissed {
    Carry,
    Skip,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct TaskPauseRange {
    pub start: String,
    pub end: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskRepeat {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub start: Option<String>,
    pub rrule: String,
    pub anchor: TaskRepeatAnchor,
    pub missed: TaskRepeatMissed,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rdate: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub exdate: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reset_checklist: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paused: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub paused_since: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pause_ranges: Option<Vec<TaskPauseRange>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_completed_at: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub completion_count: Option<f64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "lowercase")]
pub enum TaskTracking {
    Boolean,
    Count {
        unit: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        target: Option<f64>,
    },
    Duration {
        #[serde(skip_serializing_if = "Option::is_none")]
        target: Option<String>,
    },
    Number {
        unit: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        target: Option<f64>,
    },
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "lowercase",
    rename_all_fields = "camelCase"
)]
pub enum TaskMutation {
    Checklist {
        position: f64,
        expected_text: String,
        checked: bool,
    },
    Complete {
        at: String,
        local_date: Option<String>,
    },
    Skip {
        at: String,
        local_date: Option<String>,
    },
    Plan {
        plan: Option<TaskPlan>,
        at: String,
    },
    Start {
        start: TaskStart,
        at: String,
    },
    Deadline {
        deadline: Option<String>,
        at: String,
    },
    Inbox {
        inbox: bool,
        at: String,
    },
    Repeat {
        repeat: Option<TaskRepeat>,
        at: String,
    },
    Tracking {
        tracking: Option<TaskTracking>,
        at: String,
    },
    Pause {
        at: String,
        local_date: Option<String>,
    },
    Resume {
        at: String,
        local_date: Option<String>,
    },
    Cancel {
        at: String,
    },
    Reopen {
        at: String,
    },
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum TaskOccurrenceDayPart {
    Anytime,
    Morning,
    Afternoon,
    Evening,
}
impl TaskOccurrenceDayPart {
    pub(super) fn label(self) -> &'static str {
        match self {
            Self::Anytime => "Anytime",
            Self::Morning => "Morning",
            Self::Afternoon => "Afternoon",
            Self::Evening => "Evening",
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDayPartSettings {
    pub afternoon_starts_at: String,
    pub evening_starts_at: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskOccurrenceMaterialization {
    pub task_id: String,
    pub task_path: String,
    pub title: String,
    pub occurrence_date: String,
    pub tracking: Option<TaskTracking>,
    pub day_part: TaskOccurrenceDayPart,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(
    tag = "type",
    rename_all = "lowercase",
    rename_all_fields = "camelCase"
)]
pub enum TaskOccurrenceCompletion {
    Boolean,
    Count { value: f64, unit: String },
    Duration { duration_minutes: f64 },
    Number { value: f64, unit: String },
}
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskOccurrenceObservation {
    #[serde(flatten)]
    pub record: crate::TaskOccurrenceRecord,
    pub checked: bool,
    pub title: String,
    pub href: String,
    pub day_part: TaskOccurrenceDayPart,
    pub source: String,
}
