pub(super) fn utf16_offset(raw: &str, byte: usize) -> usize {
    raw[..byte].encode_utf16().count()
}

pub(super) fn slice(raw: &str, start: usize, end: usize) -> String {
    String::from_utf16_lossy(
        &raw.encode_utf16()
            .skip(start)
            .take(end - start)
            .collect::<Vec<_>>(),
    )
}

pub(super) fn stable_hash(raw: &str) -> String {
    let mut hash = raw.encode_utf16().fold(2_166_136_261_u32, |hash, unit| {
        (hash ^ u32::from(unit)).wrapping_mul(16_777_619)
    });
    let mut digits = Vec::new();
    loop {
        digits.push(char::from_digit(hash % 36, 36).unwrap());
        hash /= 36;
        if hash == 0 {
            break;
        }
    }
    digits.into_iter().rev().collect()
}
