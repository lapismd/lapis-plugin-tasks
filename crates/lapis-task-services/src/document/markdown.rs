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
static HEADING_CLOSE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+#+\s*\z").unwrap());
static HEADING_SETEXT: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\s*(?:=+|-+)\s*\z").unwrap());
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
pub(crate) enum Kind {
    Root,
    BulletList,
    Item,
    Paragraph,
    Link,
    Heading(u8),
    Inline,
    Other,
}

pub(crate) struct Node {
    pub(crate) kind: Kind,
    pub(crate) range: Range<usize>,
    pub(crate) children: Vec<Node>,
}

pub(crate) fn tree(body: &str) -> Node {
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

pub(crate) fn content_start(body: &str, node: &Node) -> usize {
    let source = &body[node.range.clone()];
    node.range.start + source.len() - source.trim_start_matches([' ', '\t', '\r', '\n']).len()
}

pub(crate) fn content_end(body: &str, node: &Node) -> usize {
    // CommonMark ranges can retain trailing blank CRLF lines. Lezer excludes
    // those lines while retaining the content line's own carriage return.
    let (mut at, mut end) = (0, 0);
    for line in body[node.range.clone()].split('\n') {
        if !trim(line).is_empty() {
            end = at + line.len();
        }
        at += line.len() + 1;
    }
    node.range.start + end
}

pub(crate) fn heading_text(body: &str, node: &Node) -> String {
    let text = HEADING_START.replace(&body[node.range.clone()], "");
    let text = HEADING_CLOSE.replace(&text, "");
    let text = HEADING_SETEXT.replace(&text, "");
    trim(&text).to_owned()
}

pub(crate) fn standalone_link(body: &str, item: &Node) -> Option<(String, String)> {
    let (range, children) = paragraph(item)?;
    if children.len() != 1
        || children[0].kind != Kind::Link
        || item
            .children
            .iter()
            .any(|node| node.kind == Kind::BulletList)
    {
        return None;
    }
    let captures = LINK.captures(trim(&body[range]))?;
    let href = trim(&captures[2]);
    if href.is_empty() || href.starts_with('#') || href.starts_with("//") || SCHEME.is_match(href) {
        return None;
    }
    Some((trim(&captures[1]).into(), href.into()))
}

pub(crate) fn checklist_item(body: &str, item: &Node) -> Option<(String, bool)> {
    let (range, _) = paragraph(item)?;
    let captures = CHECKLIST.captures(body[range].trim_end_matches('\n'))?;
    Some((trim(&captures[2]).into(), &captures[1] != " "))
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
        let source_start = offset + content_start(body, item);
        let source_end = offset + content_end(body, item);
        let utf16_start = raw[..source_start].encode_utf16().count();
        let utf16_end = raw[..source_end].encode_utf16().count();
        if let Some((title, href)) = standalone_link(body, item) {
            links.push(StructuralLink {
                title,
                href,
                kind: "reference".to_owned(),
                heading: heading.map(str::to_owned),
                ordinal: links.len(),
                source_start: Some(utf16_start),
                source_end: Some(utf16_end),
            });
        } else if let Some((text, checked)) = checklist_item(body, item) {
            checklist.push(ChecklistItem {
                text,
                checked,
                position: checklist.len(),
                source_start: utf16_start,
                source_end: utf16_end,
                source: raw[source_start..source_end].to_owned(),
            });
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
                headings[level as usize - 2] = Some(heading_text(body, &node));
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
