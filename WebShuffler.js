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
        measures.get(bar)[ch] = data;
      } else {
        header.push(line);
      }
    }

    const output = [...header];

    for (const [bar, channels] of measures.entries()) {
      const maxNotes = Math.max(...targets.map(ch => (channels[ch]?.length || 0) / 2));
      if (maxNotes === 0) {
        for (const ch in channels) {
          output.push(`#${bar}${ch}:${channels[ch]}`);
        }
        continue;
      }

      const scaled = {};
      for (const ch of targets) {
        const raw = channels[ch] || "";
        const notes = raw.match(/../g) || [];
        const out = Array(maxNotes).fill("00");
        for (let i = 0; i < notes.length; i++) {
          const idx = Math.floor(i * maxNotes / notes.length);
          out[idx] = notes[i];
        }
        scaled[ch] = out;
      }

      // シャッフル処理 per タイミング
      for (let i = 0; i < maxNotes; i++) {
        const values = targets.map(ch => scaled[ch][i]);
        const pool = values.filter(v => v !== "00");
        if (pool.length <= 1) continue;

        if (mode === "S") {
          for (let j = pool.length - 1; j > 0; j--) {
            const k = Math.floor(Math.random() * (j + 1));
            [pool[j], pool[k]] = [pool[k], pool[j]];
          }
        } else {
          // H乱（連打回避） - 最後の配置位置を考慮してランダム配置
          const prevIndex = i > 0 ? targets.map((_, idx) => scaled[targets[idx]][i - 1]) : [];
          const used = new Set();
          for (let j = 0; j < pool.length; j++) {
            for (const ch of targets) {
              const idx = targets.indexOf(ch);
              if (!used.has(idx) && (i === 0 || scaled[ch][i - 1] === "00")) {
                scaled[ch][i] = pool[j];
                used.add(idx);
                break;
              }
            }
          }
        }

        let idx = 0;
        for (const ch of targets) {
          if (scaled[ch][i] !== "00") scaled[ch][i] = pool[idx++] || "00";
        }
      }

      // 出力対象を構築
      for (const ch of Object.keys(channels)) {
        if (!targets.includes(ch)) {
          output.push(`#${bar}${ch}:${channels[ch]}`);
        }
      }
      for (const ch of targets) {
        output.push(`#${bar}${ch}:${scaled[ch].join("")}`);
      }
    }

    return output.join("\n");
  }
};
