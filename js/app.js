import { SCENARIOS, prepareScenario } from "./data.js";
import { buildKruskalSteps, buildPrimSteps } from "./mst-core.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const CODE = {
  kruskal: [
    "function kruskal(V, edges)",
    "  sort edges by (weight, u, v)",
    "  parent[x] ← x for every vertex x",
    "  for each edge (u, v, w)",
    "    ru ← find(u), rv ← find(v)",
    "    if ru = rv: continue  // cycle",
    "    union(ru, rv); total ← total + w",
    "    if selected = V − 1: break",
    "  return selected edges and total"
  ],
  prim: [
    "function prim(V, adjacency, start)",
    "  push (0, start, none) into minHeap",
    "  while minHeap is not empty",
    "    (w, v, from) ← pop minimum",
    "    if inTree[v]: continue  // stale",
    "    inTree[v] ← true; total ← total + w",
    "    push every edge from v to outside",
    "  restart if another component exists",
    "  return selected edges and total"
  ]
};

const QUIZZES = [
  {
    question: "一張連通圖有 10 個頂點，它的 MST 有幾條邊？",
    options: ["9 條", "10 條", "視權重而定"],
    answer: 0,
    explanation: "樹若有 V 個頂點，一定剛好有 V−1 條邊，因此是 10−1＝9 條。"
  },
  {
    question: "Kruskal 為什麼需要 Union-Find（併查集）？",
    options: ["找目前最小邊", "判斷加入邊是否成環", "計算所有最短路"],
    answer: 1,
    explanation: "若一條邊的兩端已屬於同一組，代表它們原本就連通，再加入便會形成環。"
  },
  {
    question: "最小生成樹裡，任兩點之間都會是原圖的最短路嗎？",
    options: ["一定會", "不一定", "只有 Prim 會"],
    answer: 1,
    explanation: "MST 最小化的是『整棵樹的總權重』，不是每一對頂點之間的距離。"
  }
];

const state = {
  algorithm: "kruskal",
  scenarioKey: "campus",
  start: 0,
  graph: null,
  steps: [],
  index: 0,
  timer: null,
  quizAnswers: new Map()
};

const elements = {
  algorithmButtons: [...document.querySelectorAll("[data-algorithm]")],
  scenarioSelect: document.querySelector("#scenarioSelect"),
  startField: document.querySelector("#startField"),
  startSelect: document.querySelector("#startSelect"),
  scenarioName: document.querySelector("#scenarioName"),
  scenarioDescription: document.querySelector("#scenarioDescription"),
  graphSvg: document.querySelector("#graphSvg"),
  dataView: document.querySelector("#dataView"),
  dataTitle: document.querySelector("#data-title"),
  statEdges: document.querySelector("#statEdges"),
  statTotal: document.querySelector("#statTotal"),
  statAuxLabel: document.querySelector("#statAuxLabel"),
  statAux: document.querySelector("#statAux"),
  stepBadge: document.querySelector("#stepBadge"),
  stepNumber: document.querySelector("#stepNumber"),
  stepTitle: document.querySelector("#stepTitle"),
  stepDescription: document.querySelector("#stepDescription"),
  codeTitle: document.querySelector("#code-title"),
  complexity: document.querySelector("#complexity"),
  codeList: document.querySelector("#codeList"),
  resetButton: document.querySelector("#resetButton"),
  prevButton: document.querySelector("#prevButton"),
  playButton: document.querySelector("#playButton"),
  nextButton: document.querySelector("#nextButton"),
  stepRange: document.querySelector("#stepRange"),
  stepCounter: document.querySelector("#stepCounter"),
  quizList: document.querySelector("#quizList"),
  quizScore: document.querySelector("#quizScore")
};

function svgElement(tag, attributes = {}) {
  const element = document.createElementNS(SVG_NS, tag);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function edgeById(id) {
  return state.graph.edges.find((edge) => edge.id === id);
}

function nodeLabel(id) {
  return state.graph.nodes[id]?.label ?? "—";
}

function edgeLabel(edge) {
  return `${nodeLabel(edge.u)}–${nodeLabel(edge.v)}`;
}

function setupSelectors() {
  elements.scenarioSelect.innerHTML = Object.entries(SCENARIOS)
    .map(([key, scenario]) => `<option value="${key}">${scenario.name}｜${scenario.short}</option>`)
    .join("");
  elements.scenarioSelect.value = state.scenarioKey;
}

function setupStartSelect() {
  elements.startSelect.innerHTML = state.graph.nodes
    .map((node) => `<option value="${node.id}">${node.label}｜${node.name}</option>`)
    .join("");
  if (!state.graph.nodes.some((node) => node.id === state.start)) state.start = 0;
  elements.startSelect.value = String(state.start);
}

function stopPlayback() {
  if (state.timer) window.clearInterval(state.timer);
  state.timer = null;
  elements.playButton.innerHTML = "<span>▶</span> 自動播放";
}

function rebuild() {
  stopPlayback();
  state.graph = prepareScenario(SCENARIOS[state.scenarioKey]);
  setupStartSelect();
  state.steps = state.algorithm === "kruskal"
    ? buildKruskalSteps(state.graph)
    : buildPrimSteps(state.graph, state.start);
  state.index = 0;
  elements.startField.hidden = state.algorithm !== "prim";
  elements.scenarioName.textContent = state.graph.name;
  elements.scenarioDescription.textContent = state.graph.description;
  elements.stepRange.max = String(state.steps.length - 1);
  drawGraph();
  drawCode();
  render();
}

function drawGraph() {
  elements.graphSvg.replaceChildren();
  const edgeLayer = svgElement("g", { class: "edge-layer" });
  const nodeLayer = svgElement("g", { class: "node-layer" });

  state.graph.edges.forEach((edge) => {
    const source = state.graph.nodes[edge.u];
    const target = state.graph.nodes[edge.v];
    const line = svgElement("line", {
      x1: source.x,
      y1: source.y,
      x2: target.x,
      y2: target.y,
      class: "graph-edge",
      "data-edge-id": edge.id
    });
    edgeLayer.append(line);

    const middleX = (source.x + target.x) / 2;
    const middleY = (source.y + target.y) / 2;
    const labelGroup = svgElement("g", { class: "edge-label", "data-edge-label": edge.id });
    labelGroup.append(
      svgElement("rect", { x: middleX - 15, y: middleY - 13, width: 30, height: 26, rx: 7 }),
      Object.assign(svgElement("text", { x: middleX, y: middleY + 1 }), { textContent: String(edge.w) })
    );
    edgeLayer.append(labelGroup);
  });

  state.graph.nodes.forEach((node) => {
    const group = svgElement("g", { class: "graph-node", "data-node-id": node.id });
    group.append(
      svgElement("circle", { class: "node-halo", cx: node.x, cy: node.y, r: 34 }),
      svgElement("circle", { class: "node-circle", cx: node.x, cy: node.y, r: 25 }),
      Object.assign(svgElement("text", { class: "node-letter", x: node.x, y: node.y + 1 }), { textContent: node.label }),
      Object.assign(svgElement("text", { class: "node-name", x: node.x, y: node.y - 38 }), { textContent: node.name })
    );
    nodeLayer.append(group);
  });

  elements.graphSvg.append(edgeLayer, nodeLayer);
}

function drawCode() {
  const lines = CODE[state.algorithm];
  elements.codeList.innerHTML = lines.map((line) => `<li>${line}</li>`).join("");
  elements.codeTitle.textContent = `PSEUDOCODE / ${state.algorithm.toUpperCase()}`;
  elements.complexity.textContent = state.algorithm === "kruskal" ? "O(E log E)" : "O(E log V)";
}

function renderGraph(step) {
  const selected = new Set(step.selected);
  const rejected = new Set(step.rejected);
  document.querySelectorAll(".graph-edge").forEach((line) => {
    const id = line.dataset.edgeId;
    line.classList.toggle("is-selected", selected.has(id));
    line.classList.toggle("is-rejected", !selected.has(id) && rejected.has(id));
    line.classList.toggle("is-current", id === step.current);
    line.classList.toggle("is-dim", Boolean(step.current) && id !== step.current && !selected.has(id));
  });

  const activeNodes = new Set();
  if (state.algorithm === "prim") {
    step.inTree.forEach((isIn, id) => { if (isIn) activeNodes.add(id); });
  } else {
    step.selected.forEach((id) => {
      const edge = edgeById(id);
      activeNodes.add(edge.u);
      activeNodes.add(edge.v);
    });
  }
  document.querySelectorAll(".graph-node").forEach((group) => {
    group.classList.toggle("is-tree", activeNodes.has(Number(group.dataset.nodeId)));
  });
}

function renderKruskalData(step) {
  const selected = new Set(step.selected);
  const rejected = new Set(step.rejected);
  const processed = new Set(step.processed);
  const edgeRows = step.order.map((id, index) => {
    const edge = edgeById(id);
    const classes = [
      processed.has(id) ? "is-processed" : "",
      selected.has(id) ? "is-selected" : "",
      rejected.has(id) ? "is-rejected" : "",
      step.current === id ? "is-current" : ""
    ].filter(Boolean).join(" ");
    return `<div class="edge-pill ${classes}"><span>#${String(index + 1).padStart(2, "0")}</span><b>${edgeLabel(edge)}</b><em>${edge.w}</em></div>`;
  }).join("");
  const parentCells = step.parent.map((parent, id) => `
    <div class="parent-cell"><span>p[${nodeLabel(id)}]</span><b>${nodeLabel(parent)}</b></div>
  `).join("");
  elements.dataView.innerHTML = `
    <section class="data-section">
      <div class="data-label"><span>SORTED EDGES</span><span>權重小 → 大</span></div>
      <div class="edge-stack">${edgeRows}</div>
    </section>
    <section class="data-section">
      <div class="data-label"><span>UNION-FIND / PARENT</span><span>代表節點</span></div>
      <div class="parent-grid">${parentCells}</div>
    </section>
  `;
  elements.dataTitle.textContent = "排序邊＋併查集";
}

function renderPrimData(step) {
  const tickets = step.queue.slice(0, 10).map((ticket, index) => `
    <div class="queue-ticket">
      <span>#${String(index + 1).padStart(2, "0")}</span>
      <b>${ticket.from < 0 ? "起點" : `${nodeLabel(ticket.from)}→${nodeLabel(ticket.v)}`}</b>
      <em>${ticket.w}</em>
    </div>
  `).join("");
  const treeCells = step.inTree.map((isIn, id) => `
    <div class="tree-cell ${isIn ? "is-in" : ""}"><span>${nodeLabel(id)}</span><b>${isIn ? "IN" : "OUT"}</b></div>
  `).join("");
  elements.dataView.innerHTML = `
    <section class="data-section">
      <div class="data-label"><span>MIN-HEAP / CANDIDATES</span><span>最小票在上</span></div>
      <div class="queue-stack">${tickets || '<div class="empty-data">優先佇列目前是空的</div>'}</div>
    </section>
    <section class="data-section">
      <div class="data-label"><span>IN TREE</span><span>頂點狀態</span></div>
      <div class="tree-grid">${treeCells}</div>
    </section>
  `;
  elements.dataTitle.textContent = "優先佇列＋造訪狀態";
}

function renderCode(step) {
  [...elements.codeList.children].forEach((line, index) => {
    line.classList.toggle("is-active", index === Math.max(0, step.line - 1));
  });
  const active = elements.codeList.querySelector(".is-active");
  if (active) {
    elements.codeList.scrollTop = Math.max(0, active.offsetTop - elements.codeList.offsetTop - 54);
  }
}

function render() {
  const step = state.steps[state.index];
  const targetEdges = state.steps.at(-1).selected.length;
  elements.statEdges.textContent = `${step.selected.length} / ${targetEdges}`;
  elements.statTotal.textContent = String(step.total);
  elements.statAuxLabel.textContent = state.algorithm === "kruskal" ? "成環淘汰" : "舊票淘汰";
  elements.statAux.textContent = String(step.rejected.length);
  elements.stepBadge.textContent = step.badge;
  elements.stepNumber.textContent = `STEP ${String(state.index).padStart(2, "0")}`;
  elements.stepTitle.textContent = step.title;
  elements.stepDescription.textContent = step.description;
  elements.stepRange.value = String(state.index);
  elements.stepCounter.textContent = `${String(state.index).padStart(2, "0")} / ${String(state.steps.length - 1).padStart(2, "0")}`;
  elements.prevButton.disabled = state.index === 0;
  elements.resetButton.disabled = state.index === 0;
  elements.nextButton.disabled = state.index === state.steps.length - 1;
  elements.playButton.disabled = state.steps.length <= 1;
  renderGraph(step);
  if (state.algorithm === "kruskal") renderKruskalData(step);
  else renderPrimData(step);
  renderCode(step);
}

function moveTo(index) {
  state.index = Math.max(0, Math.min(index, state.steps.length - 1));
  render();
  if (state.index === state.steps.length - 1) stopPlayback();
}

function togglePlayback() {
  if (state.timer) {
    stopPlayback();
    return;
  }
  if (state.index === state.steps.length - 1) moveTo(0);
  elements.playButton.innerHTML = "<span>Ⅱ</span> 暫停播放";
  state.timer = window.setInterval(() => moveTo(state.index + 1), 1050);
}

function setupEvents() {
  elements.algorithmButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.algorithm = button.dataset.algorithm;
      elements.algorithmButtons.forEach((item) => {
        const active = item === button;
        item.classList.toggle("is-active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      rebuild();
    });
  });

  elements.scenarioSelect.addEventListener("change", (event) => {
    state.scenarioKey = event.target.value;
    state.start = 0;
    rebuild();
  });
  elements.startSelect.addEventListener("change", (event) => {
    state.start = Number(event.target.value);
    rebuild();
  });
  elements.resetButton.addEventListener("click", () => { stopPlayback(); moveTo(0); });
  elements.prevButton.addEventListener("click", () => { stopPlayback(); moveTo(state.index - 1); });
  elements.nextButton.addEventListener("click", () => { stopPlayback(); moveTo(state.index + 1); });
  elements.playButton.addEventListener("click", togglePlayback);
  elements.stepRange.addEventListener("input", (event) => { stopPlayback(); moveTo(Number(event.target.value)); });

  document.addEventListener("keydown", (event) => {
    if (["INPUT", "SELECT", "BUTTON"].includes(document.activeElement?.tagName)) return;
    if (event.key === "ArrowLeft") { event.preventDefault(); stopPlayback(); moveTo(state.index - 1); }
    if (event.key === "ArrowRight") { event.preventDefault(); stopPlayback(); moveTo(state.index + 1); }
    if (event.code === "Space") { event.preventDefault(); togglePlayback(); }
  });
}

function renderQuiz() {
  elements.quizList.innerHTML = QUIZZES.map((quiz, quizIndex) => `
    <article class="question-card" data-question="${quizIndex}">
      <h3><span>Q${String(quizIndex + 1).padStart(2, "0")}</span>${quiz.question}</h3>
      <div class="answer-options">
        ${quiz.options.map((option, optionIndex) => `<button type="button" data-option="${optionIndex}">${option}</button>`).join("")}
      </div>
      <p class="answer-feedback" hidden></p>
    </article>
  `).join("");

  elements.quizList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-option]");
    if (!button) return;
    const card = button.closest("[data-question]");
    const questionIndex = Number(card.dataset.question);
    if (state.quizAnswers.has(questionIndex)) return;
    const chosen = Number(button.dataset.option);
    const quiz = QUIZZES[questionIndex];
    state.quizAnswers.set(questionIndex, chosen === quiz.answer);
    const buttons = [...card.querySelectorAll("[data-option]")];
    buttons.forEach((item, index) => {
      item.disabled = true;
      if (index === quiz.answer) item.classList.add("is-correct");
      if (index === chosen && chosen !== quiz.answer) item.classList.add("is-wrong");
    });
    const feedback = card.querySelector(".answer-feedback");
    feedback.hidden = false;
    feedback.textContent = `${chosen === quiz.answer ? "答對了。" : "再想一下。"}${quiz.explanation}`;
    elements.quizScore.textContent = String([...state.quizAnswers.values()].filter(Boolean).length);
  });
}

setupSelectors();
setupEvents();
renderQuiz();
rebuild();

window.MSTLab = {
  getState: () => ({
    algorithm: state.algorithm,
    scenarioKey: state.scenarioKey,
    step: state.index,
    stepCount: state.steps.length
  })
};
