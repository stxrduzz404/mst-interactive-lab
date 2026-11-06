const copy = (value) => JSON.parse(JSON.stringify(value));

function edgeName(edge, nodes) {
  return `${nodes[edge.u].label}–${nodes[edge.v].label}`;
}

function sortedEdges(edges) {
  return [...edges].sort((a, b) =>
    a.w - b.w || a.u - b.u || a.v - b.v
  );
}

function componentCount(parent) {
  const roots = new Set();
  const rootOf = (x) => {
    while (parent[x] !== x) x = parent[x];
    return x;
  };
  for (let i = 0; i < parent.length; i += 1) roots.add(rootOf(i));
  return roots.size;
}

export function buildKruskalSteps(graph) {
  const { nodes, edges } = graph;
  const parent = nodes.map((_, index) => index);
  const order = sortedEdges(edges);
  const selected = [];
  const rejected = [];
  const processed = [];
  const steps = [];
  let total = 0;

  const find = (x) => {
    if (parent[x] !== x) parent[x] = find(parent[x]);
    return parent[x];
  };

  const addStep = (payload) => steps.push({
    algorithm: "kruskal",
    parent: copy(parent),
    order: order.map((edge) => edge.id),
    selected: [...selected],
    rejected: [...rejected],
    processed: [...processed],
    total,
    current: null,
    line: 0,
    ...payload
  });

  addStep({
    kind: "start",
    badge: "START",
    title: "準備所有邊",
    description: `圖中有 ${nodes.length} 個頂點、${edges.length} 條邊。目標是挑出不成環且總重最小的邊。`,
    line: 1
  });

  addStep({
    kind: "sort",
    badge: "SORT",
    title: "依權重排序",
    description: `排序結果：${order.map((edge) => `${edgeName(edge, nodes)}(${edge.w})`).join("、")}。`,
    line: 2
  });

  addStep({
    kind: "init",
    badge: "INIT",
    title: "初始化併查集",
    description: "每個頂點先各自成為一組，p[x] = x。之後用 find 判斷兩端是否已經連通。",
    line: 3
  });

  for (const edge of order) {
    if (selected.length === nodes.length - 1) break;
    processed.push(edge.id);
    addStep({
      kind: "consider",
      badge: "CHECK",
      title: `檢查 ${edgeName(edge, nodes)}，權重 ${edge.w}`,
      description: "先找出邊兩端目前所屬群組的代表，若代表相同，加進去就會形成環。",
      current: edge.id,
      line: 4
    });

    const rootU = find(edge.u);
    const rootV = find(edge.v);
    if (rootU === rootV) {
      rejected.push(edge.id);
      addStep({
        kind: "reject",
        badge: "CYCLE",
        title: `跳過 ${edgeName(edge, nodes)}`,
        description: `${nodes[edge.u].label} 與 ${nodes[edge.v].label} 的代表都是 ${nodes[rootU].label}，兩端原本就連通；加入會成環。`,
        current: edge.id,
        line: 6
      });
      continue;
    }

    const newRoot = Math.min(rootU, rootV);
    const oldRoot = Math.max(rootU, rootV);
    parent[oldRoot] = newRoot;
    selected.push(edge.id);
    total += edge.w;
    addStep({
      kind: "take",
      badge: "TAKE",
      title: `收下 ${edgeName(edge, nodes)}`,
      description: `兩端分屬不同群組，可以安全合併。總重增加 ${edge.w}，目前是 ${total}。`,
      current: edge.id,
      line: 7
    });
  }

  for (let i = 0; i < parent.length; i += 1) find(i);
  const components = componentCount(parent);
  addStep({
    kind: "done",
    badge: "DONE",
    title: components === 1 ? `完成最小生成樹，總重 ${total}` : `完成最小生成森林，總重 ${total}`,
    description: components === 1
      ? `共選 ${selected.length} 條邊，剛好是 V−1；所有頂點連通且沒有環。`
      : `原圖有 ${components} 個連通元件，只能得到 ${components} 棵樹；共選 V−${components} = ${selected.length} 條邊。`,
    current: null,
    line: 9,
    components
  });

  return steps;
}

function ticketCompare(a, b) {
  return a.w - b.w || a.v - b.v || a.from - b.from;
}

export function buildPrimSteps(graph, start = 0) {
  const { nodes, edges } = graph;
  const adjacency = nodes.map(() => []);
  for (const edge of edges) {
    adjacency[edge.u].push({ v: edge.v, w: edge.w, edgeId: edge.id });
    adjacency[edge.v].push({ v: edge.u, w: edge.w, edgeId: edge.id });
  }
  adjacency.forEach((list) => list.sort((a, b) => a.w - b.w || a.v - b.v));

  const inTree = nodes.map(() => false);
  const selected = [];
  const rejected = [];
  const processed = [];
  const queue = [];
  const steps = [];
  let total = 0;
  let components = 0;

  const addStep = (payload) => steps.push({
    algorithm: "prim",
    inTree: [...inTree],
    queue: copy([...queue].sort(ticketCompare)),
    selected: [...selected],
    rejected: [...rejected],
    processed: [...processed],
    total,
    current: null,
    line: 0,
    ...payload
  });

  addStep({
    kind: "start",
    badge: "START",
    title: `從 ${nodes[start].label} 開始`,
    description: "Prim 維持一棵逐步長大的樹，每次從優先佇列拿出跨向樹外、權重最小的候選邊。",
    line: 1
  });

  const startOrder = [start, ...nodes.map((node) => node.id).filter((id) => id !== start)];
  for (const componentStart of startOrder) {
    if (inTree[componentStart]) continue;
    components += 1;
    queue.push({ w: 0, v: componentStart, from: -1, edgeId: null });
    addStep({
      kind: components === 1 ? "seed" : "component",
      badge: components === 1 ? "SEED" : "RESTART",
      title: components === 1
        ? `把起點 ${nodes[componentStart].label} 放進候選佇列`
        : `發現另一個連通元件，改從 ${nodes[componentStart].label} 開始`,
      description: components === 1
        ? "起點票的權重是 0，from 設為 —，表示它不是透過任何邊加入。"
        : "原本的佇列已空，但仍有頂點未造訪；重新放入一張權重 0 的起點票，建立下一棵樹。",
      line: 2
    });

    while (queue.length > 0) {
      queue.sort(ticketCompare);
      const ticket = queue.shift();
      if (ticket.edgeId) processed.push(ticket.edgeId);
      addStep({
        kind: "pop",
        badge: "POP",
        title: ticket.from < 0
          ? `取出起點 ${nodes[ticket.v].label}`
          : `取出 ${nodes[ticket.from].label}–${nodes[ticket.v].label}，權重 ${ticket.w}`,
        description: "優先佇列永遠先取出權重最小的票；權重相同時，以要加入的頂點字母排序。",
        current: ticket.edgeId,
        hand: copy(ticket),
        line: 4
      });

      if (inTree[ticket.v]) {
        if (ticket.edgeId) rejected.push(ticket.edgeId);
        addStep({
          kind: "stale",
          badge: "STALE",
          title: `丟掉通往 ${nodes[ticket.v].label} 的舊票`,
          description: `${nodes[ticket.v].label} 已經透過更便宜或更早的邊進入樹中，這張票不再需要。`,
          current: ticket.edgeId,
          hand: copy(ticket),
          line: 5
        });
        continue;
      }

      inTree[ticket.v] = true;
      if (ticket.edgeId) {
        selected.push(ticket.edgeId);
        total += ticket.w;
      }
      addStep({
        kind: "take",
        badge: "TAKE",
        title: ticket.from < 0
          ? `${nodes[ticket.v].label} 成為第 ${components} 棵樹的起點`
          : `收下 ${nodes[ticket.from].label}–${nodes[ticket.v].label}`,
        description: ticket.from < 0
          ? "起點不需要邊，因此總重不變。"
          : `${nodes[ticket.v].label} 第一次進入樹中，總重增加 ${ticket.w}，目前是 ${total}。`,
        current: ticket.edgeId,
        hand: copy(ticket),
        line: 6
      });

      const pushed = [];
      for (const next of adjacency[ticket.v]) {
        if (inTree[next.v]) continue;
        const newTicket = { w: next.w, v: next.v, from: ticket.v, edgeId: next.edgeId };
        queue.push(newTicket);
        pushed.push(newTicket);
      }
      if (pushed.length > 0) {
        addStep({
          kind: "push",
          badge: "PUSH",
          title: `加入 ${pushed.length} 張新候選票`,
          description: `從 ${nodes[ticket.v].label} 往樹外的邊：${pushed.map((item) => `${nodes[item.from].label}–${nodes[item.v].label}(${item.w})`).join("、")}。`,
          current: null,
          line: 7
        });
      }
    }
  }

  addStep({
    kind: "done",
    badge: "DONE",
    title: components === 1 ? `完成最小生成樹，總重 ${total}` : `完成最小生成森林，總重 ${total}`,
    description: components === 1
      ? `所有 ${nodes.length} 個頂點已加入，選了 ${selected.length} 條邊。`
      : `圖共有 ${components} 個連通元件，Prim 分別從各元件建立一棵最小生成樹。`,
    line: 9,
    components
  });

  return steps;
}

export function resultOf(steps) {
  const last = steps.at(-1);
  return {
    total: last.total,
    selected: [...last.selected],
    components: last.components ?? 1
  };
}
