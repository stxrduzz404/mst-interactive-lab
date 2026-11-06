export const SCENARIOS = {
  campus: {
    name: "校園佈線",
    short: "經典範例",
    description: "六棟建築要全部連上網路，同時讓鋪設總長度最低。",
    nodes: [
      { id: 0, label: "A", name: "校門", x: 92, y: 206 },
      { id: 1, label: "B", name: "圖書館", x: 246, y: 72 },
      { id: 2, label: "C", name: "餐廳", x: 246, y: 336 },
      { id: 3, label: "D", name: "系館", x: 458, y: 72 },
      { id: 4, label: "E", name: "宿舍", x: 458, y: 336 },
      { id: 5, label: "F", name: "體育館", x: 620, y: 206 }
    ],
    edges: [
      [0, 1, 4], [0, 2, 2], [1, 2, 1], [1, 3, 5], [2, 3, 8],
      [2, 4, 10], [3, 4, 2], [3, 5, 6], [4, 5, 3]
    ]
  },
  tie: {
    name: "平手廣場",
    short: "多組答案",
    description: "多條邊同權重，可能得到不同的樹，但最小總重相同。",
    nodes: [
      { id: 0, label: "A", name: "北門", x: 110, y: 90 },
      { id: 1, label: "B", name: "展館", x: 350, y: 54 },
      { id: 2, label: "C", name: "湖畔", x: 590, y: 90 },
      { id: 3, label: "D", name: "講堂", x: 182, y: 330 },
      { id: 4, label: "E", name: "廣場", x: 518, y: 330 }
    ],
    edges: [
      [0, 1, 2], [1, 2, 2], [0, 3, 3], [1, 3, 3],
      [1, 4, 3], [2, 4, 3], [3, 4, 4]
    ]
  },
  forest: {
    name: "離島校區",
    short: "不連通圖",
    description: "圖分成兩個連通元件，因此答案是最小生成森林，而不是單一棵樹。",
    nodes: [
      { id: 0, label: "A", name: "一館", x: 110, y: 110 },
      { id: 1, label: "B", name: "二館", x: 290, y: 66 },
      { id: 2, label: "C", name: "三館", x: 214, y: 292 },
      { id: 3, label: "D", name: "四館", x: 432, y: 106 },
      { id: 4, label: "E", name: "五館", x: 610, y: 66 },
      { id: 5, label: "F", name: "六館", x: 536, y: 292 }
    ],
    edges: [
      [0, 1, 2], [0, 2, 5], [1, 2, 3],
      [3, 4, 1], [3, 5, 4], [4, 5, 2]
    ]
  }
};

export function prepareScenario(raw) {
  return {
    ...raw,
    edges: raw.edges.map(([u, v, w], index) => ({
      id: `e${index}`,
      u: Math.min(u, v),
      v: Math.max(u, v),
      w
    }))
  };
}
