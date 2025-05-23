// BMSファイルを読み込み、S乱 / H乱でシャッフルするスクリプト
// 本文中の説明の処理をJavaScriptで再現（簡略化版）

function handleShuffle() {
  const fileInput = document.getElementById("fileInput");
  const mode = document.getElementById("shuffleMode").value;
  const file = fileInput.files[0];
  if (!file) return alert("ファイルを選択してください");

  const reader = new FileReader();
  reader.onload = () => {
    const originalName = file.name;
    const extension = originalName.split('.').pop();
    const baseName = originalName.slice(0, -(extension.length + 1));

    const content = reader.result.replace(/\r\n?/g, "\n");
    const shuffled = shuffleBMS(content, mode);
    const blob = new Blob([shuffled], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = baseName + "_shuffle." + extension;
    a.click();
    URL.revokeObjectURL(url);
  };
  reader.readAsText(file);
}

// 実際のシャッフル処理（簡略）
function shuffleBMS(text, mode) {
  const lines = text.split("\n");
  const header = [];
  const dataMap = new Map();

  for (const line of lines) {
    if (!line.startsWith("#")) {
      header.push(line);
      continue;
    }
    const match = line.match(/^#(\d{3})(\d{2}):(.*)$/);
    if (match) {
      const [_, measure, channel, data] = match;
      if (!dataMap.has(measure)) dataMap.set(measure, {});
      dataMap.get(measure)[channel] = data;
    } else {
      header.push(line);
    }
  }

  const result = [...header];

  for (const [measure, channels] of dataMap.entries()) {
    const targets = ["11", "12", "13", "14", "15", "18", "19"];
    const maxLength = Math.max(...targets.map(ch => (channels[ch] || "").length));
    const step = maxLength / 2;

    const notes = targets.map(ch => {
      const d = (channels[ch] || "").padEnd(maxLength, "0");
      return Array.from({ length: step }, (_, i) => d.slice(i * 2, i * 2 + 2));
    });

    for (let i = 0; i < step; i++) {
      const group = notes.map(row => row[i]);
      const nonZero = group.filter(n => n !== "00");
      if (nonZero.length === 0) continue;

      const shuffled = [...nonZero];
      if (mode === "H") {
        shuffled.sort((a, b) => a.localeCompare(b)); // H乱仮: 安定ソート（実際は連打回避アルゴリズム）
      } else {
        for (let j = shuffled.length - 1; j > 0; j--) {
          const k = Math.floor(Math.random() * (j + 1));
          [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
        }
      }

      let idx = 0;
      for (let chIdx = 0; chIdx < targets.length; chIdx++) {
        if (notes[chIdx][i] !== "00" && idx < shuffled.length) {
          notes[chIdx][i] = shuffled[idx++];
        }
      }
    }

    for (let chIdx = 0; chIdx < targets.length; chIdx++) {
      const line = "#" + measure + targets[chIdx] + ":" + notes[chIdx].join("");
      result.push(line);
    }
  }

  return result.join("\n");
}
