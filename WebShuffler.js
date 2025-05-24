const WebShuffler = {
  shuffle: (text, mode) => {
    const lines = text.split(/\r?\n/);
    const header = [];
    const measures = new Map();
    const targets = ["11", "12", "13", "14", "15", "18", "19"];
    const extraLines = [];
    let titleModified = false;

    for (const line of lines) {
      const m = line.match(/^#(\d{3})(\d{2}):(.*)$/);
      if (m) {
        const [_, bar, ch, data] = m;
        if (!targets.includes(ch)) {
          extraLines.push(line);
        } else {
          if (!measures.has(bar)) measures.set(bar, {});
          if (!measures.get(bar)[ch]) {
            measures.get(bar)[ch] = data;
          }
        }
      } else {
        if (line.startsWith("#TITLE") && !titleModified) {
          header.push(line + (mode === "S" ? " [S乱]" : " [H乱]"));
          titleModified = true;
        } else {
          header.push(line);
        }
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

      const prevLane = Array(targets.length).fill(null);

      for (let i = 0; i < maxLen; i++) {
        const activeNotes = [];
        for (const ch of targets) {
          if (channelNotes[ch][i] !== "00") {
            activeNotes.push(channelNotes[ch][i]);
            channelNotes[ch][i] = "00";
          }
        }

        if (activeNotes.length === 0) continue;

        if (mode === "S") {
          const shuffledChs = [...targets];
          const shuffledNotes = [...activeNotes];
          shuffleArray(shuffledChs);
          shuffleArray(shuffledNotes);
          for (let j = 0; j < shuffledNotes.length; j++) {
            channelNotes[shuffledChs[j]][i] = shuffledNotes[j];
          }
        } else if (mode === "H") {
          const shuffledNotes = [...activeNotes];
          shuffleArray(shuffledNotes);

          const assigned = new Set();
          const thisLane = Array(targets.length).fill(null);
          const laneCandidates = targets.map((ch, idx) => ({ ch, index: idx }));

          for (const note of shuffledNotes) {
            const valid = laneCandidates.filter(({ ch, index }) =>
              !assigned.has(ch) && prevLane[index] !== note
            );

            let target;
            if (valid.length > 0) {
              target = valid[Math.floor(Math.random() * valid.length)];
            } else {
              const scored = laneCandidates
                .filter(({ ch }) => !assigned.has(ch))
                .map(({ ch, index }) => ({
                  ch,
                  index,
                  score: prevLane[index] === note ? 1 : 0
                }))
                .sort((a, b) => a.score - b.score);
              target = scored[0];
            }

            if (target) {
              channelNotes[target.ch][i] = note;
              prevLane[target.index] = note;
              assigned.add(target.ch);
              thisLane[target.index] = note;
            }
          }
        }
      }

      for (const ch of targets) {
        result.push(`#${bar}${ch}:${channelNotes[ch].join("")}`);
      }
    }

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



