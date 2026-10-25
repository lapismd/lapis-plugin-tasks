use crate::TaskDocumentKind;
use crate::document::{
    envelope,
    markdown::{self, Kind, Node},
};

use super::records::{
    HeadingContext, ScannedChecklistItem, ScannedTaskStructure, StructuralEntryCandidate,
    TaskStructureOptions,
};
use super::source::utf16_offset;

fn context(raw: &str, body: &str, offset: usize, node: &Node, level: u8) -> HeadingContext {
    HeadingContext {
        path: Vec::new(),
        level: Some(level),
        text: Some(markdown::heading_text(body, node)),
        source_start: Some(utf16_offset(raw, offset + node.range.start)),
        source_end: Some(utf16_offset(
            raw,
            offset + markdown::content_end(body, node),
        )),
    }
}

pub fn scan_task_headings(raw: &str) -> Vec<HeadingContext> {
    let body = envelope::body(raw);
    let offset = raw.len() - body.len();
    let mut active: Vec<Option<HeadingContext>> = Vec::new();
    let mut headings = Vec::new();
    for node in markdown::tree(body).children {
        let Kind::Heading(level @ 2..=6) = node.kind else {
            continue;
        };
        active.resize(level as usize - 1, None);
        let mut heading = context(raw, body, offset, &node, level);
        heading.path = active
            .iter()
            .take(level as usize - 2)
            .flatten()
            .filter_map(|entry| entry.text.clone())
            .chain(heading.text.clone())
            .collect();
        active[level as usize - 2] = Some(heading.clone());
        headings.push(heading);
    }
    headings
}

struct Scanner<'a> {
    raw: &'a str,
    body: &'a str,
    offset: usize,
    options: &'a TaskStructureOptions,
    result: ScannedTaskStructure,
}

impl Scanner<'_> {
    fn list(&mut self, list: &Node, depth: usize, heading: &HeadingContext) {
        for (position, item) in list
            .children
            .iter()
            .filter(|node| node.kind == Kind::Item)
            .enumerate()
        {
            let byte_start = self.offset + markdown::content_start(self.body, item);
            let byte_end = self.offset + markdown::content_end(self.body, item);
            let start = utf16_offset(self.raw, byte_start);
            let end = utf16_offset(self.raw, byte_end);
            if let Some((label, href)) = markdown::standalone_link(self.body, item) {
                self.result.candidates.push(StructuralEntryCandidate {
                    source_document_id: self.options.document_id.clone(),
                    source_document_path: self.options.document_path.clone(),
                    authored_label: label,
                    authored_href: href,
                    heading: heading.clone(),
                    list_depth: depth,
                    list_start: utf16_offset(
                        self.raw,
                        self.offset + markdown::content_start(self.body, list),
                    ),
                    position_in_list: position,
                    source_start: start,
                    source_end: end,
                    source: self.raw[byte_start..byte_end].into(),
                });
            } else if self.options.document_kind == TaskDocumentKind::Task {
                if let Some((text, checked)) = markdown::checklist_item(self.body, item) {
                    self.result.checklist.push(ScannedChecklistItem {
                        text,
                        checked,
                        heading: heading.clone(),
                        position: self.result.checklist.len(),
                        source_start: start,
                        source_end: end,
                        source: self.raw[byte_start..byte_end].into(),
                    });
                }
            }
            for child in item
                .children
                .iter()
                .filter(|node| node.kind == Kind::BulletList)
            {
                self.list(child, depth + 1, heading);
            }
        }
    }
}

pub fn scan_task_structure(raw: &str, options: &TaskStructureOptions) -> ScannedTaskStructure {
    let body = envelope::body(raw);
    let offset = raw.len() - body.len();
    let mut scanner = Scanner {
        raw,
        body,
        offset,
        options,
        result: ScannedTaskStructure::default(),
    };
    let mut headings: Vec<Option<HeadingContext>> = Vec::new();
    for node in markdown::tree(body).children {
        match node.kind {
            Kind::Heading(1) => {}
            Kind::Heading(level) => {
                headings.resize(level as usize - 1, None);
                headings[level as usize - 2] = Some(context(raw, body, offset, &node, level));
            }
            Kind::BulletList => {
                let mut owner = headings
                    .iter()
                    .rev()
                    .flatten()
                    .next()
                    .cloned()
                    .unwrap_or_else(HeadingContext::empty);
                owner.path = headings
                    .iter()
                    .flatten()
                    .filter_map(|entry| entry.text.clone())
                    .filter(|text| !text.is_empty())
                    .collect();
                scanner.list(&node, 0, &owner);
            }
            _ => {}
        }
    }
    scanner.result
}
