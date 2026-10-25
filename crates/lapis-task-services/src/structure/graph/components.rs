struct Components {
    next_index: usize,
    next_group: usize,
    indexes: Vec<Option<usize>>,
    low_links: Vec<usize>,
    stack: Vec<usize>,
    on_stack: Vec<bool>,
    cyclic_groups: Vec<Option<usize>>,
}

impl Components {
    fn connect(&mut self, node: usize, adjacency: &[Vec<usize>]) {
        self.indexes[node] = Some(self.next_index);
        self.low_links[node] = self.next_index;
        self.next_index += 1;
        self.stack.push(node);
        self.on_stack[node] = true;

        for &target in &adjacency[node] {
            if self.indexes[target].is_none() {
                self.connect(target, adjacency);
                self.low_links[node] = self.low_links[node].min(self.low_links[target]);
            } else if self.on_stack[target] {
                self.low_links[node] = self.low_links[node].min(self.indexes[target].unwrap());
            }
        }
        if Some(self.low_links[node]) != self.indexes[node] {
            return;
        }

        let mut members = Vec::new();
        loop {
            let member = self.stack.pop().unwrap();
            self.on_stack[member] = false;
            members.push(member);
            if member == node {
                break;
            }
        }
        if members.len() > 1 || adjacency[node].contains(&node) {
            for member in members {
                self.cyclic_groups[member] = Some(self.next_group);
            }
            self.next_group += 1;
        }
    }
}

pub(super) fn cyclic_groups(adjacency: &[Vec<usize>]) -> Vec<Option<usize>> {
    let mut components = Components {
        next_index: 0,
        next_group: 0,
        indexes: vec![None; adjacency.len()],
        low_links: vec![0; adjacency.len()],
        stack: Vec::new(),
        on_stack: vec![false; adjacency.len()],
        cyclic_groups: vec![None; adjacency.len()],
    };
    for node in 0..adjacency.len() {
        if components.indexes[node].is_none() {
            components.connect(node, adjacency);
        }
    }
    components.cyclic_groups
}
