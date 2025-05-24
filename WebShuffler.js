const WebShuffler = {
  shuffle: (text, mode) => {
    const lines = text.split(/\r?\n/);
    const header = [];
    const measures = new Map();
    const targets = ["11", "12", "13", "14", "15", "18", "19"];

    // パース
    for (const line of lines) {
      const m = line.match(/^#(\d{3})(\d{2}):(.*)$/);
      if (m) {
        const [_, bar, ch, data] = m;
        if (!measures.has(bar)) measures.set(bar, {});
        if (!measures.get(bar)[ch]) {
          measures.get(bar)[ch] = data;
        } else {
          // 同じ小節+チャンネル（例: #00401）が複数回ある場合も保持
          measures.get(bar)[ch + '_DUP'] = data;
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

      // リスケーリング
      for (const ch of targets) {
        const notes = channelNotes[ch];
        const rescaled = Array(maxLen).fill("00");
        for (let i = 0; i < notes.length; i++) {
          const idx = Math.floor(i * maxLen / notes.length);
          rescaled[idx] = notes[i];
        }
        channelNotes[ch] = rescaled;
      }

      // 各タイミング位置でシャッフル
      for (let i = 0; i < maxLen; i++) {
        const activeNotes = [];
        for (const ch of targets) {
          if (channelNotes[ch][i] !== "00") activeNotes.push(channelNotes[ch][i]);
          channelNotes[ch][i] = "00";
        }

        if (mode === "S") {
          // S乱: ランダムなチャンネルに1音ずつ、かぶりなし
          const shuffledChs = [...targets];
          const shuffledNotes = [...activeNotes];
          shuffleArray(shuffledChs);
          shuffleArray(shuffledNotes);
          for (let j = 0; j < shuffledNotes.length; j++) {
            channelNotes[shuffledChs[j]][i] = shuffledNotes[j];
          }
        } else if (mode === "H") {
          // H乱: 連打回避（同じレーン連続禁止。ただし例外あり）
          const prev = i > 0 ? targets.map(ch => channelNotes[ch][i - 1]) : [];
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
          // 残りは連打を許容して埋める
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

      // 出力構築
      const used = new Set();
      for (const ch in chs) {
        if (!targets.includes(ch.replace("_DUP", ""))) {
          result.push(`#${bar}${ch}:${chs[ch]}`);
          used.add(ch);
        }
      }
      for (const ch of targets) {
        result.push(`#${bar}${ch}:${channelNotes[ch].join("")}`);
      }
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
