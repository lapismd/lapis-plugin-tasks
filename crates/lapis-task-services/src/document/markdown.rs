use std::{collections::HashMap, ops::Range, sync::LazyLock};

use pulldown_cmark::{Event, Parser, Tag};
use regex::Regex;

use crate::marker::{JS_SPACE, trim};

use super::records::{ChecklistItem, StructuralLink};

static LINK: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\A\[([^\]]+)\]\(([^)]+)\)\z").unwrap());
static SCHEME: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?i)\A[a-z][a-z0-9+.-]*:").unwrap());
static CHECKLIST: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(&format!(r"\A\[( |x|X)\][{JS_SPACE}]+(?s:(.+))\z")).unwrap());
static HEADING_START: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\A {0,3}#{1,6}\s*").unwrap());
static HEADING_END: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\s+#+\s*\z|\s*(?:=+|-+)\s*\z").unwrap());
static NAV_HEADING: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(&format!(
        r"\A#{{1,6}}[{JS_SPACE}]+([^\r\n\u{{2028}}\u{{2029}}]+?)[{JS_SPACE}]*\z"
    ))
    .unwrap()
});
static NAV_LINK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(&format!(
        r"\A[{JS_SPACE}]*[-*][{JS_SPACE}]+\[([^\]]+)\]\(([^)]+)\)[{JS_SPACE}]*\z"
    ))
    .unwrap()
});

pub(super) fn navigation(body: &str) -> Vec<StructuralLink> {
    let mut heading = None;
    let mut ordinals = HashMap::new();
    let mut links = Vec::new();
    for line in body.split('\n') {
        if let Some(captures) = NAV_HEADING.captures(line) {
            heading = Some(trim(&captures[1]).to_owned());
        } else if let Some(captures) = NAV_LINK.captures(line) {
            let ordinal = ordinals
                .entry(heading.clone().unwrap_or_default())
                .or_insert(0);
            links.push(StructuralLink {
                title: captures[1].to_owned(),
                href: captures[2].to_owned(),
                kind: "navigation-item".to_owned(),
                heading: heading.clone(),
                ordinal: *ordinal,
                source_start: None,
                source_end: None,
            });
            *ordinal += 1;
        }
    }
    links
}

#[derive(Clone, Copy, PartialEq)]
enum Kind {
    Root,
    BulletList,
    Item,
    Paragraph,
    Link,
    Heading(u8),
    Inline,
    Other,
}

struct Node {
    kind: Kind,
    range: Range<usize>,
    children: Vec<Node>,
}

fn tree(body: &str) -> Node {
    let mut stack = vec![Node {
        kind: Kind::Root,
        range: 0..body.len(),
        children: Vec::new(),
    }];
    for (event, range) in Parser::new(body).into_offset_iter() {
        match event {
            Event::Start(tag) => {
                let kind = match tag {
                    Tag::List(None) => Kind::BulletList,
                    Tag::Item => Kind::Item,
                    Tag::Paragraph => Kind::Paragraph,
                    Tag::Link { .. } => Kind::Link,
                    Tag::Heading { level, .. } => Kind::Heading(level as u8),
                    Tag::Emphasis | Tag::Strong | Tag::Image { .. } => Kind::Inline,
                    _ => Kind::Other,
                };
                stack.push(Node {
                    kind,
                    range,
                    children: Vec::new(),
                });
            }
            Event::End(_) => {
                let node = stack.pop().unwrap();
                stack.last_mut().unwrap().children.push(node);
            }
            _ => stack.last_mut().unwrap().children.push(Node {
                kind: Kind::Inline,
                range,
                children: Vec::new(),
            }),
        }
    }
    stack.pop().unwrap()
}

fn paragraph(item: &Node) -> Option<(Range<usize>, Vec<&Node>)> {
    if let Some(paragraph) = item
        .children
        .iter()
        .find(|node| node.kind == Kind::Paragraph)
    {
        let end = paragraph.range.end;
        return Some((
            paragraph.range.start..end,
            paragraph.children.iter().collect(),
        ));
    }
    // CommonMark omits paragraph events for a tight list. Lezer still exposes
    // that paragraph, so retain the contiguous inline range explicitly.
    let inline: Vec<_> = item
        .children
        .iter()
        .take_while(|node| matches!(node.kind, Kind::Inline | Kind::Link))
        .collect();
    Some((
        inline.first()?.range.start..inline.last()?.range.end,
        inline,
    ))
}

fn links_and_checklist(
    raw: &str,
    body: &str,
    offset: usize,
    list: &Node,
    heading: Option<&str>,
    links: &mut Vec<StructuralLink>,
    checklist: &mut Vec<ChecklistItem>,
) {
    for item in list.children.iter().filter(|node| node.kind == Kind::Item) {
        let source_start = offset + item.range.start;
        let source_end =
            offset + item.range.start + body[item.range.clone()].trim_end_matches('\n').len();
        let utf16_start = raw[..source_start].encode_utf16().count();
        let utf16_end = raw[..source_end].encode_utf16().count();
        if let Some((range, children)) = paragraph(item) {
            let paragraph = &body[range];
            let candidate = (children.len() == 1
                && children[0].kind == Kind::Link
                && !item
                    .children
                    .iter()
                    .any(|node| node.kind == Kind::BulletList))
            .then(|| LINK.captures(trim(paragraph)))
            .flatten()
            .filter(|captures| {
                let href = trim(&captures[2]);
                !href.is_empty()
                    && !href.starts_with('#')
                    && !href.starts_with("//")
                    && !SCHEME.is_match(href)
            });
            if let Some(captures) = candidate {
                links.push(StructuralLink {
                    title: trim(&captures[1]).to_owned(),
                    href: trim(&captures[2]).to_owned(),
                    kind: "reference".to_owned(),
                    heading: heading.map(str::to_owned),
                    ordinal: links.len(),
                    source_start: Some(utf16_start),
                    source_end: Some(utf16_end),
                });
            } else if let Some(captures) = CHECKLIST.captures(paragraph.trim_end_matches('\n')) {
                checklist.push(ChecklistItem {
                    text: trim(&captures[2]).to_owned(),
                    checked: &captures[1] != " ",
                    position: checklist.len(),
                    source_start: utf16_start,
                    source_end: utf16_end,
                    source: raw[source_start..source_end].to_owned(),
                });
            }
        }
        for child in item
            .children
            .iter()
            .filter(|node| node.kind == Kind::BulletList)
        {
            links_and_checklist(raw, body, offset, child, heading, links, checklist);
        }
    }
}

pub(super) fn structure(raw: &str, body: &str) -> (Vec<StructuralLink>, Vec<ChecklistItem>) {
    let offset = raw.len() - body.len();
    let mut headings: Vec<Option<String>> = Vec::new();
    let (mut links, mut checklist) = (Vec::new(), Vec::new());
    for node in tree(body).children {
        match node.kind {
            Kind::Heading(1) => {}
            Kind::Heading(level) => {
                headings.resize(level as usize - 1, None);
                let text = HEADING_START.replace(&body[node.range], "");
                let text = HEADING_END.replace(&text, "");
                headings[level as usize - 2] = Some(trim(&text).to_owned());
            }
            Kind::BulletList => links_and_checklist(
                raw,
                body,
                offset,
                &node,
                headings.iter().rev().flatten().next().map(String::as_str),
                &mut links,
                &mut checklist,
            ),
            _ => {}
        }
    }
    (links, checklist)
}
