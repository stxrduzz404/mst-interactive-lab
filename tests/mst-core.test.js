import test from "node:test";
import assert from "node:assert/strict";
import { SCENARIOS, prepareScenario } from "../js/data.js";
import { buildKruskalSteps, buildPrimSteps, resultOf } from "../js/mst-core.js";

test("校園圖的 Kruskal 與 Prim 都得到總重 13", () => {
  const graph = prepareScenario(SCENARIOS.campus);
  const kruskal = resultOf(buildKruskalSteps(graph));
  const prim = resultOf(buildPrimSteps(graph, 0));

  assert.equal(kruskal.total, 13);
  assert.equal(prim.total, 13);
  assert.equal(kruskal.selected.length, 5);
  assert.equal(prim.selected.length, 5);
  assert.deepEqual(new Set(kruskal.selected), new Set(prim.selected));
});

test("Kruskal 會標記 A-B 為成環淘汰邊", () => {
  const graph = prepareScenario(SCENARIOS.campus);
  const steps = buildKruskalSteps(graph);
  const rejectedStep = steps.find((step) => step.kind === "reject");
  const edge = graph.edges.find((item) => item.id === rejectedStep.current);

  assert.deepEqual([edge.u, edge.v, edge.w], [0, 1, 4]);
  assert.match(rejectedStep.title, /跳過/);
});

test("Prim 換起點不改變校園圖的最小總重", () => {
  const graph = prepareScenario(SCENARIOS.campus);
  for (const node of graph.nodes) {
    assert.equal(resultOf(buildPrimSteps(graph, node.id)).total, 13);
  }
});

test("不連通圖回傳兩棵樹組成的最小生成森林", () => {
  const graph = prepareScenario(SCENARIOS.forest);
  const kruskal = resultOf(buildKruskalSteps(graph));
  const prim = resultOf(buildPrimSteps(graph, 0));

  assert.deepEqual(kruskal, { total: 8, selected: ["e3", "e0", "e5", "e2"], components: 2 });
  assert.equal(prim.total, 8);
  assert.equal(prim.selected.length, 4);
  assert.equal(prim.components, 2);
});

test("平手圖仍能產生合法的 V-1 條最小生成樹", () => {
  const graph = prepareScenario(SCENARIOS.tie);
  const kruskal = resultOf(buildKruskalSteps(graph));
  const prim = resultOf(buildPrimSteps(graph, 0));

  assert.equal(kruskal.total, 10);
  assert.equal(prim.total, 10);
  assert.equal(kruskal.selected.length, graph.nodes.length - 1);
  assert.equal(prim.selected.length, graph.nodes.length - 1);
});
