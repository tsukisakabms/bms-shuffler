const WebShuffler = {
  shuffle: (text, mode) => {
    const lines = text.split(/\r?\n/);
    const header = [];
    const measures = new Map();
    const targets = ["11", "12", "13", "14", "15", "18", "19"];
    const extraLines = []; // 重複チャンネル行をそのまま保持

    for (const line of lines) {
      const m = line.match(/^#(\d{3})(\d{2}):(.*)$/);
      if (m) {
        const [_, bar, ch, data] = m;
        if (!targets.includes(ch)) {
          extraLines.push(line); // 対象外チャンネルはそのまま出力に使う
        } else {
          if (!measures.has(bar)) measures.set(bar, {});
          const barData = measures.get(bar);
          if (!barData[ch]) {
            barData[ch] = data;
          } else {
            // 既にある対象チャンネルは2度目以降を無視（今回はシャッフル対象のみに制限）
          }
        }
      } else {
        header.push(line);
      }
    }

    const result = [...header];

    for (const [bar, chs] of measures.entries()) {
      const channelNotes = {};
      let maxLen = 0;
      for (const ch of targets) {
        const data = chs[ch] || "";
        const notes = data.match(/../g) || [];
        channelNotes[ch] = notes;
        maxLen = Math.max(maxLen, notes.length);
      }

      for (const ch of targets) {
        const notes = channelNotes[ch];
        const rescaled = Array(maxLen).fill("00");
        for (let i = 0; i < notes.length; i++) {
          const idx = Math.floor(i * maxLen / notes.length);
          rescaled[idx] = notes[i];
        }
        channelNotes[ch] = rescaled;
      }

      for (let i = 0; i < maxLen; i++) {
        const activeNotes = [];
        for (const ch of targets) {
          if (channelNotes[ch][i] !== "00") activeNotes.push(channelNotes[ch][i]);
          channelNotes[ch][i] = "00";
        }

        if (mode === "S") {
          const shuffledChs = [...targets];
          const shuffledNotes = [...activeNotes];
          shuffleArray(shuffledChs);
          shuffleArray(shuffledNotes);
          for (let j = 0; j < shuffledNotes.length; j++) {
            channelNotes[shuffledChs[j]][i] = shuffledNotes[j];
          }
        } else if (mode === "H") {
          const assigned = new Set();
          const shuffledNotes = [...activeNotes];
          shuffleArray(shuffledNotes);
          for (const note of shuffledNotes) {
            for (const ch of targets) {
              if (!assigned.has(ch) && (i === 0 || channelNotes[ch][i - 1] === "00")) {
                channelNotes[ch][i] = note;
                assigned.add(ch);
                break;
              }
            }
          }
          for (const note of shuffledNotes) {
            if ([...assigned].includes(note)) continue;
            for (const ch of targets) {
              if (!assigned.has(ch)) {
                channelNotes[ch][i] = note;
                assigned.add(ch);
                break;
              }
            }
          }
        }
      }

      for (const ch of targets) {
        result.push(`#${bar}${ch}:${channelNotes[ch].join("")}`);
      }
    }

    // 重複行や対象外チャンネルを最後に追加
    for (const line of extraLines) {
      result.push(line);
    }

    return result.join("\n");
  }
};

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

